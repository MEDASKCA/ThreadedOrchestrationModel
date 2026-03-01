import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ChatMessage } from "@/components/ChatPanel";

export type ChatThread = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  messageCount: number;
};

const COLLECTION = "chatThreads";

export async function saveChatThread(
  title: string,
  messages: ChatMessage[]
): Promise<string> {
  const doc = await addDoc(collection(db, COLLECTION), {
    title: title.slice(0, 80),
    messages,
    messageCount: messages.length,
    createdAt: serverTimestamp(),
  });
  return doc.id;
}

export async function loadChatThreads(maxItems = 30): Promise<ChatThread[]> {
  const q = query(
    collection(db, COLLECTION),
    orderBy("createdAt", "desc"),
    limit(maxItems)
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title ?? "Untitled",
      messages: data.messages ?? [],
      createdAt:
        data.createdAt instanceof Timestamp
          ? data.createdAt.toDate()
          : new Date(),
      messageCount: data.messageCount ?? (data.messages?.length ?? 0),
    };
  });
}
