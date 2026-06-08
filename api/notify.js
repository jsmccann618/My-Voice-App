export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  
  const { message } = req.body;
  
  const response = await fetch("https://api.pushover.net/1/messages.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: "aton7ur16z58dxjrf6bankpcd6mrme",
      user: "uwk9g771up4mgjpmmbwhqxhnmkrhk2",
      title: "🗣️ My Voice",
      message: message,
      sound: "magic",
    }),
  });

  const data = await response.json();
  res.status(200).json(data);
}
