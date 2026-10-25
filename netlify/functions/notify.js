const PROJECT_ID = "topup-center-577dc";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { statusCode: 500, body: "Server settings missing" };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return { statusCode: 400, body: "Bad request" }; }
  const { orderId, idToken } = body;
  if (!orderId || !idToken || !/^[A-Za-z0-9]+$/.test(orderId)) return { statusCode: 400, body: "Missing data" };

  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/orders/${orderId}`;
  const r = await fetch(url, { headers: { Authorization: "Bearer " + idToken } });
  if (!r.ok) return { statusCode: 403, body: "Not allowed" };
  const d = (await r.json()).fields || {};
  const v = k => (d[k] && (d[k].stringValue ?? d[k].integerValue ?? "")) || "";

  const text =
    "🛒 New order - GameDoko\n\n" +
    "Game: " + v("game") + "\n" +
    "Package: " + v("item") + "\n" +
    "Amount: Rs " + v("price") + "\n" +
    "ID/UID: " + v("gameId") + "\n" +
    "Name: " + v("userName") + "\n" +
    "Email: " + v("email") + "\n" +
    "Proof: " + v("screenshot") + "\n\n" +
    "Check your eSewa, then Approve/Reject in the app's Admin panel.";

  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  return { statusCode: tg.ok ? 200 : 502, body: tg.ok ? "ok" : "telegram error" };
};
