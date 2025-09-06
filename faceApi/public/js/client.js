// client.js
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');

const ws = new WebSocket('ws://localhost:3000');
let peerConnection;
let localStream;

// Bagian 1: Mendapatkan stream video lokal
const getLocalStream = async () => {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        console.log('Local stream:', localStream);
    } catch (e) {
        console.error('Error getting local stream:', e);
    }
};

// Bagian 2: Menyiapkan Peer Connection
const createPeerConnection = () => {
    peerConnection = new RTCPeerConnection({
        // Konfigurasi server STUN/TURN,
        // contoh: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });

    // Menambahkan track video dan audio dari stream lokal
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // Menangani event saat peer lain mengirim track (video/audio)
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    // Menangani event ICE candidate
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            // Mengirim ICE candidate ke peer lain via server signaling
            ws.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
        }
    };
};

// Bagian 3: Signaling (mengirim/menerima offer/answer)
ws.onmessage = async (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'offer') {
        // Menerima offer dari peer lain, menyiapkan jawaban
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        ws.send(JSON.stringify(answer));
    } else if (message.type === 'answer') {
        // Menerima jawaban dari peer lain
        await peerConnection.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'ice-candidate') {
        // Menerima ICE candidate
        await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
};

// Logika untuk memulai panggilan
startButton.onclick = async () => {
    await getLocalStream();
    // createPeerConnection();

    // Membuat "offer" untuk peer lain
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    ws.send(JSON.stringify(offer));
};