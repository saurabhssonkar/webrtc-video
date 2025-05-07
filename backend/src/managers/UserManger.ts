import { Socket } from "socket.io";
import { RoomManager } from "./RoomManager";

export interface User {
    socket: Socket;
    name: string;
}

export class UserManager {
    private users: User[];
    private queue: string[];
    private roomManager: RoomManager;
    private readonly MAX_USERS_PER_ROOM = 4;
    
    constructor() {
        this.users = [];
        this.queue = [];
        this.roomManager = new RoomManager();
    }

    addUser(name: string, socket: Socket) {
        this.users.push({
            name, socket
        })
        this.queue.push(socket.id);
        socket.emit("lobby");
        this.clearQueue()
        this.initHandlers(socket);
    }

    removeUser(socketId: string) {
        const user = this.users.find(x => x.socket.id === socketId);
        
        this.users = this.users.filter(x => x.socket.id !== socketId);
        this.queue = this.queue.filter(x => x === socketId);
    }

    clearQueue() {
        console.log("inside clear queues")
        console.log(this.queue.length);
        if (this.queue.length < this.MAX_USERS_PER_ROOM) {
            return;
        }

        // Get users for the new room
        const roomUsers: User[] = [];
        for (let i = 0; i < this.MAX_USERS_PER_ROOM; i++) {
            const socketId = this.queue.pop();
            if (!socketId) break;
            
            const user = this.users.find(x => x.socket.id === socketId);
            if (user) {
                roomUsers.push(user);
            }
        }

        if (roomUsers.length === this.MAX_USERS_PER_ROOM) {
            console.log("creating room with", roomUsers.length, "users");
            this.roomManager.createRoom(roomUsers, this.MAX_USERS_PER_ROOM);
        } else {
            // Put users back in queue if we couldn't form a complete room
            roomUsers.forEach(user => {
                this.queue.push(user.socket.id);
            });
        }

        // Check if we can form another room
        if (this.queue.length >= this.MAX_USERS_PER_ROOM) {
            this.clearQueue();
        }
    }

    initHandlers(socket: Socket) {
        socket.on("offer", ({sdp, roomId}: {sdp: string, roomId: string}) => {
            this.roomManager.onOffer(roomId, sdp, socket.id);
        })

        socket.on("answer",({sdp, roomId}: {sdp: string, roomId: string}) => {
            this.roomManager.onAnswer(roomId, sdp, socket.id);
        })

        socket.on("add-ice-candidate", ({candidate, roomId, type}) => {
            this.roomManager.onIceCandidates(roomId, socket.id, candidate, type);
        });
    }
}

