import { MatrixClient, SimpleFsStorageProvider, AutojoinRoomsMixin } from "matrix-bot-sdk";
import config from "./config.json";

async function main() {
    const client = new MatrixClient(
        config.homeserverUrl,
        config.accessToken,
        new SimpleFsStorageProvider("./store.db"),
    );
    AutojoinRoomsMixin.setupOnClient(client);
    client.on("room.message", async (roomId, event) => {
        console.log(`Got ${roomId} -> ${event.event_id} ${event.sender}`);
        const body = event.content.body.toLowerCase() || "";
        console.log(event);
        const rules = config.rules.filter((rule) => {
            const rooms_ok = !rule.room_is || rule.room_is.includes(roomId);
            const text_ok = !rule.text_contains || rule.text_contains.find((t) => body.includes(t.toLowerCase()));
            return rooms_ok && text_ok;
        });
        console.log(rules);
        await Promise.all(rules.map((rule) => {
            const relatesToContent = {
                "m.relates_to": {
                    "rel_type": "m.annotation",
                    "event_id": event.event_id,
                    "key": rule.reaction.key,
                },
            };
            return sendReaction(client, roomId, relatesToContent);
        }));
    });
    await client.start();
}

async function sendReaction(client: MatrixClient, roomId: string, content: any): Promise<string> {
    const txnId = (new Date().getTime()) + "__REQ";
    return client.doRequest("PUT", "/_matrix/client/r0/rooms/" + encodeURIComponent(roomId) + "/send/m.reaction/" + encodeURIComponent(txnId), null, content).then(response => {
        return response['event_id'];
    });
}


main().then(() => {

}).catch((err) => {
    console.error("Exited early: ", err);
    process.exit(1);
})