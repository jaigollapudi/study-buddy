import { getTextProvider } from "@/lib/ai";
import { config } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  const health = await getTextProvider().health();
  const chatReady = health.models?.some((m) =>
    m.startsWith(config.ollama.chatModel.split(":")[0]),
  );
  const embedReady = health.models?.some((m) =>
    m.startsWith(config.ollama.embedModel.split(":")[0]),
  );

  return Response.json({
    ...health,
    expected: {
      chatModel: config.ollama.chatModel,
      embedModel: config.ollama.embedModel,
    },
    chatReady: Boolean(chatReady),
    embedReady: Boolean(embedReady),
  });
}
