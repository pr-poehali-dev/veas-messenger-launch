const API_BASE = 'https://functions.poehali.dev';
const SIGNALING_URL = '861f2fbd-00c4-4dc1-80eb-11c30a34c596';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export class WebRTCCall {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private sessionToken: string;
  private targetUserId: number;
  private pollingInterval: NodeJS.Timeout | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onCallEndCallback: (() => void) | null = null;

  constructor(sessionToken: string, targetUserId: number) {
    this.sessionToken = sessionToken;
    this.targetUserId = targetUserId;
  }

  async startCall(onRemoteStream: (stream: MediaStream) => void, onCallEnd: () => void) {
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallEndCallback = onCallEnd;

    this.localStream = await navigator.mediaDevices.getUserMedia({ 
      audio: true, 
      video: false 
    });

    this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });

    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream!.addTrack(track);
      });
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream!);
      }
    };

    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.sendSignal('ice_candidate', { candidate: event.candidate });
      }
    };

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    
    await this.sendSignal('offer', { offer });

    this.startPolling();

    return this.localStream;
  }

  async answerCall(onRemoteStream: (stream: MediaStream) => void, onCallEnd: () => void, offer: RTCSessionDescriptionInit) {
    this.onRemoteStreamCallback = onRemoteStream;
    this.onCallEndCallback = onCallEnd;

    this.localStream = await navigator.mediaDevices.getUserMedia({ 
      audio: true, 
      video: false 
    });

    this.peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.localStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.localStream!);
    });

    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream!.addTrack(track);
      });
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream!);
      }
    };

    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.sendSignal('ice_candidate', { candidate: event.candidate });
      }
    };

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    
    await this.sendSignal('answer', { answer });

    this.startPolling();

    return this.localStream;
  }

  private async sendSignal(action: string, data: any) {
    await fetch(`${API_BASE}/${SIGNALING_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Token': this.sessionToken
      },
      body: JSON.stringify({
        action,
        target_user_id: this.targetUserId,
        ...data
      })
    });
  }

  private startPolling() {
    this.pollingInterval = setInterval(async () => {
      const response = await fetch(`${API_BASE}/${SIGNALING_URL}`, {
        method: 'GET',
        headers: { 'X-Session-Token': this.sessionToken }
      });
      
      const data = await response.json();
      
      if (data.success && data.signals) {
        for (const signal of data.signals) {
          if (signal.from_user_id === this.targetUserId) {
            await this.handleSignal(signal);
          }
        }
      }
    }, 1000);
  }

  private async handleSignal(signal: any) {
    if (!this.peerConnection) return;

    if (signal.signal_type === 'answer') {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(signal.signal_data.answer)
      );
    } else if (signal.signal_type === 'ice') {
      await this.peerConnection.addIceCandidate(
        new RTCIceCandidate(signal.signal_data.candidate)
      );
    }
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled;
    }
    return false;
  }

  endCall() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    if (this.peerConnection) {
      this.peerConnection.close();
    }

    if (this.onCallEndCallback) {
      this.onCallEndCallback();
    }
  }
}
