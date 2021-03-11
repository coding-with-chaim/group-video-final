import React from "react";
import { v1 as uuid } from "uuid";
import {getHR, getId} from "reversible-human-readable-id";

const CreateRoom = (props) => {
    function create() {
        const id = uuid();
        const niceId = getHR(id);
        props.history.push(`/room/${niceId}`);
    }

    return (
        <button onClick={create}>Create room</button>
    );
};

export default CreateRoom;
