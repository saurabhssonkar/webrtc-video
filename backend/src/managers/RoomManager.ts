import { User } from "./UserManger";

let GLOBAL_ROOM_ID = 1;

interface Room {
    users: User[];
    maxUsers: number;
}

export class RoomManager {
    private rooms: Map<string, Room>
    constructor() {
        this.rooms = new Map<string, Room>()
    }

    createRoom(users: User[], maxUsers: number = 4) {
        const roomId = this.generate().toString();
        this.rooms.set(roomId.toString(), {
            users,
            maxUsers
        })

        // Notify all users in the room
        users.forEach(user => {
            user.socket.emit("send-offer", {
                roomId,
                users: users.map(u => ({ id: u.socket.id, name: u.name }))
            })
        })
    }

    onOffer(roomId: string, sdp: string, senderSocketid: string) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        // Broadcast to all other users in the room
        room.users.forEach(user => {
            if (user.socket.id !== senderSocketid) {
                user.socket.emit("offer", {
                    sdp,
                    roomId,
                    senderId: senderSocketid
                })
            }
        })
    }
    
    onAnswer(roomId: string, sdp: string, senderSocketid: string) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        // Broadcast to all other users in the room
        room.users.forEach(user => {
            if (user.socket.id !== senderSocketid) {
                user.socket.emit("answer", {
                    sdp,
                    roomId,
                    senderId: senderSocketid
                });
            }
        })
    }

    onIceCandidates(roomId: string, senderSocketid: string, candidate: any, type: "sender" | "receiver") {
        const room = this.rooms.get(roomId);
        if (!room) {
            return;
        }
        // Broadcast to all other users in the room
        room.users.forEach(user => {
            if (user.socket.id !== senderSocketid) {
                user.socket.emit("add-ice-candidate", {
                    candidate,
                    type,
                    senderId: senderSocketid
                });
            }
        })
    }

    generate() {
        return GLOBAL_ROOM_ID++;
    }
}

