const PROJECT_ID = "topup-center-577dc";
const DB = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const field = (d, k) => (d && d[k] && (d[k].stringValue ?? d[k].integerValue ?? "")) || "";

async function getDoc(path, idToken) {
  const r = await fetch(`${DB}/${path}`, { headers: { Authorization: "Bearer " + idToken } });
  if (!r.ok) return null;
  return (await r.json()).fields || {};
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { statusCode: 500, body: "Server settings missing" };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return { statusCode: 400, body: "Bad request" }; }
  const { type, orderId, uid, messageId, idToken } = body;
  const safe = s => typeof s === "string" && /^[A-Za-z0-9_-]+$/.test(s);
  if (!idToken) return { statusCode: 400, body: "Missing data" };

  let text;
  if (type === "chat") {
    if (!safe(uid) || !safe(messageId)) return { statusCode: 400, body: "Missing data" };
    const msg = await getDoc(`chats/${uid}/messages/${messageId}`, idToken);
    if (!msg || field(msg, "from") !== "user") return { statusCode: 403, body: "Not allowed" };
    const chat = (await getDoc(`chats/${uid}`, idToken)) || {};
    text =
      "💬 New message - GameDoko\n\n" +
      "From: " + (field(chat, "userName") || "Customer") + "\n" +
      "Email: " + field(chat, "email") + "\n\n" +
      field(msg, "text") + "\n\n" +
      "Reply in the app: Settings > Admin panel > Chats.";
  } else {
    if (!safe(orderId)) return { statusCode: 400, body: "Missing data" };
    const d = await getDoc(`orders/${orderId}`, idToken);
    if (!d) return { statusCode: 403, body: "Not allowed" };
    text =
      "🛒 New order - GameDoko\n\n" +
      "Game: " + field(d, "game") + "\n" +
      "Package: " + field(d, "item") + "\n" +
      "Amount: Rs " + field(d, "price") + "\n" +
      "ID/UID: " + field(d, "gameId") + "\n" +
      "Name: " + field(d, "userName") + "\n" +
      "Email: " + field(d, "email") + "\n" +
      "Screenshot: " + (field(d, "screenshot") || "not uploaded") + "\n" +
      (field(d, "senderPhone") ? "Sender phone: " + field(d, "senderPhone") + "\nSender amount: NPR " + field(d, "senderAmount") + "\nTransaction code: " + field(d, "txnCode") + "\n" : "") + "\n" +
      "Check your eSewa, then Approve/Reject in the app's Admin panel.";
  }

  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  return { statusCode: tg.ok ? 200 : 502, body: tg.ok ? "ok" : "telegram error" };
};
