const loaclVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let localStream;
let peerConnection;

const socket = io();


// ================================
// WebRTC bağlantısı oluştur
// ================================

function createPeerConnection() {

    const pc = new RTCPeerConnection({
        iceServers: [
            {
                urls: "stun:stun.l.google.com:19302"
            }
        ]
    });

    pc.ontrack = (event) => {
        console.log("Karşı taraftan görüntü geldi !");
        remoteVideo.srcObject = event.streams[0];
    };

    pc.onicecandidate = (event) => {

        if (event.candidate) {
            socket.emit("ice-candidate", event.candidate);
        }

    };

    return pc;
}


// İlk WebRTC bağlantısını oluştur
peerConnection = createPeerConnection();


// ================================
// Socket bağlantısı
// ================================

socket.on("connect", () => {
    console.log("Socket.IO bağlantısı kuruldu:", socket.id);
});


// ================================
// Kamera ve mikrofon
// ================================

navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
})
.then(stream => {

    localStream = stream;

    loaclVideo.srcObject = stream;

    stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
    });

})
.catch(error => {
    console.error("Kamera veya mikrofon açılamadı:", error);
});


// ================================
// İlk görüşme
// ================================

socket.on("user-joined", async () => {

    console.log("Karşı taraf bağlandı, Offer oluşturuluyor...");

    const offer = await peerConnection.createOffer();

    await peerConnection.setLocalDescription(offer);

    socket.emit("offer", offer);

});


// ================================
// Offer alındı
// ================================

socket.on("offer", async (offer) => {

    console.log("Offer alındı.");

    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    socket.emit("answer", answer);

});


// ================================
// Answer alındı
// ================================

socket.on("answer", async (answer) => {

    console.log("Answer alındı.");

    await peerConnection.setRemoteDescription(answer);

});


// ================================
// ICE Candidate
// ================================

socket.on("ice-candidate", async (candidate) => {

    console.log("ICE Candidate alındı.");

    try {

        await peerConnection.addIceCandidate(candidate);

    } catch (error) {

        console.error("ICE Candidate eklenemedi:", error);

    }

});


// ================================
// Butonlar
// ================================

const micButton = document.getElementById("micButton");
const micStatus = document.getElementById("micStatus");

const cameraButton = document.getElementById("cameraButton");
const endButton = document.getElementById("endButton");
const newCallButton = document.getElementById("newCallButton");


// ================================
// Mikrofon aç / kapa
// ================================

micButton.addEventListener("click", () => {

    const audioTrack = localStream.getAudioTracks()[0];

    audioTrack.enabled = !audioTrack.enabled;

    if (audioTrack.enabled) {

        micButton.textContent = "🎤 Mikrofonu Kapat";
        micStatus.classList.add("hidden");

    } else {

        micButton.textContent = "🔇 Mikrofonu Aç";
        micStatus.classList.remove("hidden");

    }

});


// ================================
// Kamera aç / kapa
// ================================

cameraButton.addEventListener("click", () => {

    console.log("KAMERA BUTONUNA BASILDI");

    const videoTrack = localStream.getVideoTracks()[0];

    console.log("Video track:", videoTrack);
    console.log("Şu an enabled:", videoTrack.enabled);

    videoTrack.enabled = !videoTrack.enabled;

    console.log("Yeni enabled:", videoTrack.enabled);

    if (videoTrack.enabled) {

        cameraButton.textContent = "📷 Kamerayı Kapat";

    } else {

        cameraButton.textContent = "📷 Kamerayı Aç";

    }

});


// ================================
// Görüşmeyi bitir
// ================================

endButton.addEventListener("click", () => {

    console.log("Görüşme bitiriliyor...");

    // Karşı tarafa haber ver
    socket.emit("call-ended");

    // Kamera ve mikrofonu kapat
    if (localStream) {

        localStream.getTracks().forEach(track => {
            track.stop();
        });

    }

    // WebRTC bağlantısını kapat
    if (peerConnection) {
        peerConnection.close();
    }

    // Görüntüleri temizle
    loaclVideo.srcObject = null;
    remoteVideo.srcObject = null;

    // Butonları değiştir
    endButton.classList.add("hidden");
    newCallButton.classList.remove("hidden");

    console.log("Görüşme sona erdi.");

});


// ================================
// Karşı taraf görüşmeyi bitirdi
// ================================

socket.on("call-ended", () => {

    console.log("Karşı taraf görüşmeyi bitirdi.");

    // Kendi kamera ve mikrofonunu kapat
    if (localStream) {

        localStream.getTracks().forEach(track => {
            track.stop();
        });

    }

    // WebRTC bağlantısını kapat
    if (peerConnection) {
        peerConnection.close();
    }

    // Görüntüleri temizle
    loaclVideo.srcObject = null;
    remoteVideo.srcObject = null;

    // Butonları değiştir
    newCallButton.classList.remove("hidden");
    endButton.classList.add("hidden");

    console.log("Görüşme sona erdi.");

});


// ================================
// Yeni görüşme
// ================================

newCallButton.addEventListener("click", async () => {

    console.log("Yeni görüşme başlatılıyor...");

    try {

        // Kamerayı ve mikrofonu tekrar aç
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        // Kendi görüntünü göster
        loaclVideo.srcObject = localStream;

        // Eski bağlantının yerine yeni bağlantı oluştur
        peerConnection = createPeerConnection();

        // Kamera ve mikrofonu yeni bağlantıya ekle
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Butonları değiştir
        newCallButton.classList.add("hidden");
        endButton.classList.remove("hidden");

        micButton.textContent = "🎤 Mikrofonu Kapat";
        cameraButton.textContent = "📷 Kamerayı Kapat";

        // Karşı tarafa haber ver
        socket.emit("new-call");

        console.log("Yeni görüşme isteği gönderildi.");

    } catch (error) {

        console.error(
            "Kamera veya mikrofon yeniden açılamadı:",
            error
        );

    }

});


// ================================
// Karşı taraf yeni görüşme başlattı
// ================================

socket.on("new-call", async () => {

    console.log("Karşı taraf yeni görüşme başlatıyor...");

    try {

        // Kamerayı ve mikrofonu yeniden aç
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        // Kendi görüntünü tekrar göster
        loaclVideo.srcObject = localStream;

        // Eski bağlantıyı kapat
        if (peerConnection) {
            peerConnection.close();
        }

        // Yeni WebRTC bağlantısı oluştur
        peerConnection = createPeerConnection();

        // Kamera ve mikrofonu yeni bağlantıya ekle
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Butonları güncelle
        newCallButton.classList.add("hidden");
        endButton.classList.remove("hidden");

        micButton.textContent = "🎤 Mikrofonu Kapat";
        cameraButton.textContent = "📷 Kamerayı Kapat";

        // Offer oluştur
        const offer = await peerConnection.createOffer();

        await peerConnection.setLocalDescription(offer);

        // Offer'ı karşı tarafa gönder
        socket.emit("offer", offer);

        console.log("Yeni Offer gönderildi.");

    } catch (error) {

        console.error(
            "Kamera veya mikrofon yeniden açılamadı:",
            error
        );

    }

});