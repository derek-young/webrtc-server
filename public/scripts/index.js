const {
  RTCPeerConnection,
  RTCSessionDescription
} = window;

const peerConnection = new RTCPeerConnection();

let isAlreadyCalling = false;

function unselectUsersFromList() {
  const alreadySelectedUser = document.querySelectorAll(
    ".active-user.active-user--selected"
  );

  alreadySelectedUser.forEach(el => {
    el.setAttribute("class", "active-user");
  });
}

(function initializeButtion() {
  const startLocalStreamButton = document.getElementById("button-start-local-stream");

  startLocalStreamButton.onclick = startLocalStream;
})()

function startLocalStream() {
  window.navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    .then(stream => {
      const localVideo = document.getElementById("local-video");
      if (localVideo) {
        localVideo.srcObject = stream;
      }

      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    })
    .catch(error => {
      console.warn(error.message);
    });
}

peerConnection.ontrack = function({
  streams: [stream]
}) {
  const remoteVideo = document.getElementById("remote-video");
  if (remoteVideo) {
    remoteVideo.srcObject = stream;
  }
};

const activeSockets = [];

(function initSocketIo() {
  const socket = io();

  socket.on("update-user-list", ({
    users
  }) => {
    console.log('new users', users)
    updateUserList(users);
  });

  socket.on("remove-user", ({
    socketId
  }) => {
    const elToRemove = document.getElementById(socketId);

    if (elToRemove) {
      elToRemove.remove();
    }
  });

  socket.on("call-made", async data => {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer)
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(answer));

    console.log('call-made', data)

    socket.emit("make-answer", {
      answer,
      to: data.socket
    });
  });

  socket.on("answer-made", async data => {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.answer)
    );

    console.log("answer-made", data)

    if (!isAlreadyCalling) {
      callUser(data.socket);
      isAlreadyCalling = true;
    }
  });

  function updateUserList(socketIds) {
    const activeUserContainer = document.getElementById("active-user-container");

    socketIds.forEach(socketId => {
      const alreadyExistingUser = document.getElementById(socketId);
      if (!alreadyExistingUser) {
        const userContainerEl = createUserItemContainer(socketId);
        activeUserContainer.appendChild(userContainerEl);
      }
    });
  }

  function createUserItemContainer(socketId) {
    const userContainerEl = document.createElement("div");

    const usernameEl = document.createElement("p");

    userContainerEl.setAttribute("class", "active-user");
    userContainerEl.setAttribute("id", socketId);
    usernameEl.setAttribute("class", "username");
    usernameEl.innerHTML = `Socket: ${socketId}`;

    userContainerEl.appendChild(usernameEl);

    userContainerEl.addEventListener("click", () => {
      unselectUsersFromList();
      userContainerEl.setAttribute("class", "active-user active-user--selected");
      const talkingWithInfo = document.getElementById("talking-with-info");
      talkingWithInfo.innerHTML = `Talking with: "Socket: ${socketId}"`;
      callUser(socketId);
    });
    return userContainerEl;
  }

  async function callUser(socketId) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(new RTCSessionDescription(offer));

    socket.emit("call-user", {
      offer,
      to: socketId
    });
  }
})();