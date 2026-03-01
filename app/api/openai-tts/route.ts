import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_MODE = (process.env.TOM_TTS_FALLBACK || "none").toLowerCase();

export async function POST(request: NextRequest) {
  try {
    let parsed: any = {};
    try {
      parsed = await request.json();
    } catch {
      const raw = await request.text().catch(() => "");
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch {
        parsed = {};
      }
    }
    const { text, voice = "fable", language } = parsed || {};

    if (!text) {
      return new Response(JSON.stringify({ useBrowserVoice: true, error: "Text is required" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const azureKey = process.env.AZURE_SPEECH_KEY;
    const azureRegion = process.env.AZURE_SPEECH_REGION;
    const detectedLang = detectLanguageHint(text, language);
    const azureVoice =
      (detectedLang && AZURE_VOICE_MAP[detectedLang]) ||
      process.env.AZURE_SPEECH_VOICE ||
      "en-GB-LibbyNeural";

    const speakWithAzure = async () => {
      if (!azureKey || !azureRegion) return null;
      const endpoint = `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`;
      const ssml = `<speak version='1.0' xml:lang='en-GB'><voice name='${azureVoice}'>${escapeXml(
        text
      )}</voice></speak>`;
      const azureRes = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": azureKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
          "User-Agent": "TOM",
        },
        body: ssml,
      });
      if (!azureRes.ok) return null;
      const buffer = Buffer.from(await azureRes.arrayBuffer());
      return buffer;
    };

    if (!apiKey) {
      const azureBuffer = await speakWithAzure();
      if (azureBuffer) {
        return new Response(azureBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-cache",
          },
        });
      }
      if (FALLBACK_MODE === "browser") {
        return new Response(JSON.stringify({ useBrowserVoice: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "OpenAI TTS not configured" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1-hd",
        voice: voice as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer",
        input: text,
        speed: 0.9,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      const azureBuffer = await speakWithAzure();
      if (azureBuffer) {
        return new Response(azureBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-cache",
          },
        });
      }
      if (FALLBACK_MODE === "browser") {
        return new Response(
          JSON.stringify({
            useBrowserVoice: true,
            error: errText || "OpenAI TTS failed",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          error: errText || "OpenAI TTS failed",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    if (FALLBACK_MODE === "browser") {
      return new Response(
        JSON.stringify({
          useBrowserVoice: true,
          error: error?.message ?? "TTS error",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    return new Response(
      JSON.stringify({
        error: error?.message ?? "TTS error",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

function escapeXml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type AzureLangKey =
  | "en-GB" | "en-US"
  | "fr-FR" | "es-ES" | "es-419" | "pt-PT" | "pt-BR" | "it-IT" | "de-DE" | "nl-NL"
  | "sv-SE" | "nb-NO" | "da-DK" | "fi-FI" | "pl-PL" | "cs-CZ" | "sk-SK" | "hu-HU"
  | "ro-RO" | "bg-BG" | "el-GR" | "uk-UA" | "ru-RU" | "sr-RS" | "hr-HR" | "bs-BA"
  | "sl-SI" | "et-EE" | "lv-LV" | "lt-LT"
  | "zh-CN" | "ja-JP" | "ko-KR" | "vi-VN" | "ne-NP"
  | "pa-IN" | "ml-IN"
  | "fil-PH" | "ceb-PH" | "hil-PH" | "ilo-PH" | "bik-PH" | "cbk-PH";

const AZURE_VOICE_MAP: Record<AzureLangKey, string> = {
  "en-GB": "en-GB-LibbyNeural",
  "en-US": "en-US-JennyNeural",
  "fr-FR": "fr-FR-DeniseNeural",
  "es-ES": "es-ES-ElviraNeural",
  "es-419": "es-MX-DaliaNeural",
  "pt-PT": "pt-PT-RaquelNeural",
  "pt-BR": "pt-BR-FranciscaNeural",
  "it-IT": "it-IT-ElsaNeural",
  "de-DE": "de-DE-KatjaNeural",
  "nl-NL": "nl-NL-ColetteNeural",
  "sv-SE": "sv-SE-SofieNeural",
  "nb-NO": "nb-NO-IselinNeural",
  "da-DK": "da-DK-ChristelNeural",
  "fi-FI": "fi-FI-NooraNeural",
  "pl-PL": "pl-PL-AgnieszkaNeural",
  "cs-CZ": "cs-CZ-VlastaNeural",
  "sk-SK": "sk-SK-ViktoriaNeural",
  "hu-HU": "hu-HU-NoemiNeural",
  "ro-RO": "ro-RO-AlinaNeural",
  "bg-BG": "bg-BG-KalinaNeural",
  "el-GR": "el-GR-AthinaNeural",
  "uk-UA": "uk-UA-PolinaNeural",
  "ru-RU": "ru-RU-DariyaNeural",
  "sr-RS": "sr-RS-SophieNeural",
  "hr-HR": "hr-HR-GabrijelaNeural",
  "bs-BA": "bs-BA-VesnaNeural",
  "sl-SI": "sl-SI-PetraNeural",
  "et-EE": "et-EE-AnuNeural",
  "lv-LV": "lv-LV-EveritaNeural",
  "lt-LT": "lt-LT-LeonaNeural",
  "zh-CN": "zh-CN-XiaoxiaoNeural",
  "ja-JP": "ja-JP-NanamiNeural",
  "ko-KR": "ko-KR-SunHiNeural",
  "vi-VN": "vi-VN-HoaiMyNeural",
  "ne-NP": "ne-NP-HemkalaNeural",
  "pa-IN": "pa-IN-GurleenNeural",
  "ml-IN": "ml-IN-SobhanaNeural",
  "fil-PH": "fil-PH-AngeloNeural",
  "ceb-PH": "ceb-PH-MaryNeural",
  "hil-PH": "fil-PH-AngeloNeural",
  "ilo-PH": "fil-PH-AngeloNeural",
  "bik-PH": "fil-PH-AngeloNeural",
  "cbk-PH": "es-ES-ElviraNeural",
};

function detectLanguageHint(text: string, explicit?: string): AzureLangKey | undefined {
  const hint = (explicit || "").trim().toLowerCase();
  const t = (text || "").toLowerCase();

  const byName: Record<string, AzureLangKey> = {
    "english": "en-GB",
    "british": "en-GB",
    "american": "en-US",
    "french": "fr-FR",
    "spanish": "es-ES",
    "latin american spanish": "es-419",
    "portuguese": "pt-PT",
    "brazilian portuguese": "pt-BR",
    "italian": "it-IT",
    "german": "de-DE",
    "dutch": "nl-NL",
    "swedish": "sv-SE",
    "norwegian": "nb-NO",
    "danish": "da-DK",
    "finnish": "fi-FI",
    "polish": "pl-PL",
    "czech": "cs-CZ",
    "slovak": "sk-SK",
    "hungarian": "hu-HU",
    "romanian": "ro-RO",
    "bulgarian": "bg-BG",
    "greek": "el-GR",
    "ukrainian": "uk-UA",
    "russian": "ru-RU",
    "serbian": "sr-RS",
    "croatian": "hr-HR",
    "bosnian": "bs-BA",
    "slovenian": "sl-SI",
    "estonian": "et-EE",
    "latvian": "lv-LV",
    "lithuanian": "lt-LT",
    "chinese": "zh-CN",
    "mandarin": "zh-CN",
    "japanese": "ja-JP",
    "korean": "ko-KR",
    "vietnamese": "vi-VN",
    "nepali": "ne-NP",
    "punjabi": "pa-IN",
    "malayalam": "ml-IN",
    "kerala": "ml-IN",
    "filipino": "fil-PH",
    "tagalog": "fil-PH",
    "bisaya": "ceb-PH",
    "cebuano": "ceb-PH",
    "ilonggo": "hil-PH",
    "hiligaynon": "hil-PH",
    "ilokano": "ilo-PH",
    "bicolano": "bik-PH",
    "bikol": "bik-PH",
    "chavacano": "cbk-PH",
    "tsbakano": "cbk-PH",
  };

  const matchByPhrase = (s: string) => {
    const found = Object.keys(byName).find((k) => s.includes(k));
    return found ? byName[found] : undefined;
  };

  if (hint) {
    const viaHint = matchByPhrase(hint);
    if (viaHint) return viaHint;
  }

  const inPhrase = /(?:in|language)\s*:\s*([a-z\s-]+)/i.exec(text || "");
  if (inPhrase?.[1]) {
    const viaPhrase = matchByPhrase(inPhrase[1].toLowerCase());
    if (viaPhrase) return viaPhrase;
  }

  // Script detection
  if (/[一-龥]/.test(text)) return "zh-CN";
  if (/[ぁ-ゟ゠-ヿ]/.test(text)) return "ja-JP";
  if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text)) return "ko-KR";
  if (/[अ-ह]/.test(text)) return "ne-NP";
  if (/[അ-ഹ]/.test(text)) return "ml-IN";
  if (/[ਪ-ਹ]/.test(text)) return "pa-IN";

  const viaName = matchByPhrase(t);
  if (viaName) return viaName;

  return undefined;
}
