import express from "npm:express@5";
import crypto from "node:crypto";

const app = express();

const {
  CLIENT_ID,
  CLIENT_SECRET,
  BOT_TOKEN,
  GUILD_ID,
  ROLE_ID,
  CALLBACK_URL
} = Deno.env.toObject();

const states = new Map();

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SOTOT FIVEM Verification</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          background:#10121b;color:white;font-family:Arial;
          display:flex;justify-content:center;align-items:center;
          min-height:100vh;margin:0
        }
        .card {
          background:#1b1e2b;padding:40px;border-radius:18px;
          text-align:center;width:330px
        }
        h1 {color:#7289ff}
        p {color:#b9bdd0}
        a {
          display:block;background:#5865F2;color:white;
          padding:15px;border-radius:9px;text-decoration:none;
          font-weight:bold;margin-top:25px
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>SOTOT FIVEM</h1>
        <h2>SERVER VERIFICATION</h2>
        <p>Verify your Discord account to access our community.</p>
        <a href="/login">LOGIN WITH DISCORD</a>
      </div>
    </body>
    </html>
  `);
});

app.get("/login", (req, res) => {
  const state = crypto.randomBytes(24).toString("hex");
  states.set(state, Date.now());

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    response_type: "code",
    scope: "identify",
    state
  });

  res.redirect("https://discord.com/oauth2/authorize?" + params);
});

app.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    const created = states.get(state);

    states.delete(state);

    if (!code || !created || Date.now() - created > 300000) {
      return res.status(400).send("Invalid verification session.");
    }

    const tokenResponse = await fetch(
      "https://discord.com/api/v10/oauth2/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: CALLBACK_URL
        })
      }
    );

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(JSON.stringify(tokenData));

    const userResponse = await fetch(
      "https://discord.com/api/v10/users/@me",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    );

    const user = await userResponse.json();
    if (!userResponse.ok) throw new Error(JSON.stringify(user));

    const roleResponse = await fetch(
      `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${user.id}/roles/${ROLE_ID}`,
      {
        method: "PUT",
        headers: { Authorization: `Bot ${BOT_TOKEN}` }
      }
    );

    if (!roleResponse.ok) {
      throw new Error(await roleResponse.text());
    }

    res.send("<h1>VERIFICATION SUCCESS!</h1><p>Welcome to SOTOT FIVEM!</p>");
  } catch (error) {
    console.error(error);
    res.status(500).send("Verification failed. Pastikan konfigurasi Discord benar.");
  }
});

app.listen(Number(Deno.env.get("PORT") || 8000), "0.0.0.0", () => {
  console.log("SOTOT FIVEM website running!");
});
