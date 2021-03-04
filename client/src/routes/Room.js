import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import ReactAudioPlayer from 'react-audio-player';

const Container = styled.div`
    padding: 20px;
    display: flex;
    height: 100vh;
    width: 90%;
    margin: auto;
    flex-wrap: wrap;
`;

const StyledVideo = styled.video`
    height: 40%;
    width: 50%;
`;

const Video = (props) => {
    const ref = useRef();

    useEffect(() => {
        props.peer.on("stream", stream => {
          if('srcObject' in ref.current){
            ref.current.srcObject = stream;
          } else {
            ref.current.src = window.URL.createObjectURL(stream)
          }
        })
    }, []);

    return (
        <StyledVideo playsInline autoPlay ref={ref} />
    );
}

const videoConstraints = {
    height: window.innerHeight / 2,
    width: window.innerWidth / 2
};

const DataInput = (props) => {
  const [message, setMessage] = useState("");

  function handleSubmit(e) {
    props.onSubmit(props.peerKey, message);
  }

  return (
    <div>
      <input type="text" id="message" placeholder="Message" onChange={e => setMessage(e.target.value)}/>
      <button onClick={handleSubmit}>Send</button>
    </div>
  );
}

const Room = (props) => {
    const [peers, setPeers] = useState([]);
    const [audio, setAudio] = useState("");
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    const roomID = props.match.params.roomID;

    useEffect(() => {
        socketRef.current = io.connect("/");
        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false }).then(stream => {
            userVideo.current.srcObject = stream;
            socketRef.current.emit("join room", roomID);
            socketRef.current.on("all users", users => {
                const peers = [];
                users.forEach(userID => {
                    const peer = createPeer(userID, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    })
                    peers.push(peer);
                })
                setPeers(peers);
            })

            socketRef.current.on("user joined", payload => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                })

                setPeers(users => [...users, peer]);
            });

            socketRef.current.on("receiving returned signal", payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });
        })
    }, []);

    function isValidURL(str) {
      var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
      return !!pattern.test(str);
    }

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
        })

        peer.on('data', data => {
          // got a data channel message
          console.log('got a message from peer: ' + data)
          if (isValidURL(data)) {
            setAudio(data);
          }
          else {
            console.log('not a valid url.');
          }
        })

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        })

        peer.on('data', data => {
          // got a data channel message
          console.log('got a message from peer: ' + data)
          if (isValidURL(data)) {
            setAudio(data);
          }
          else {
            console.log('not a valid url.');
          }
        })

        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", { signal, callerID })
        })

        peer.signal(incomingSignal);

        return peer;
    }

    function sendToAll(data) {
      console.log("Send to all: " + data);
      peers.forEach((peer, i) => {
        peer.send(data);
      });
    }

    function sendToPeer(peerIndex, data) {
      peers[peerIndex].send(data);
    }

    return (
        <Container>
          {audio !== "" &&
            <ReactAudioPlayer
              src={audio}
              autoPlay
            />
          }
          <StyledVideo muted ref={userVideo} autoPlay playsInline />
          {peers.map((peer, index) => {
              return (
                <div>
                  <DataInput onSubmit={sendToPeer} peerKey={index}/>
                  <Video key={index} peer={peer} />
                </div>
              );
          })}
        </Container>
    );
};

export default Room;
