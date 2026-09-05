"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getConversation,
  getConversations,
  markConversationRead,
  sendMessage,
} from "@/lib/api";
import {
  CUSTOMER_MESSAGE_SUGGESTIONS,
  OWNER_MESSAGE_SUGGESTIONS,
} from "@/lib/message-suggestions";
import { formatRequestDate } from "@/lib/format";
import type { ConversationMessage, ConversationSummary } from "@/lib/types";
import OwnerEmptyState from "@/components/owner/OwnerEmptyState";
import OwnerPageMotion from "@/components/owner/OwnerPageMotion";

type Role = "customer" | "owner";

type Props = {
  role: Role;
};

/** Active-thread poll — short enough for two-browser testing without WebSockets. */
const POLL_MS = 3000;

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function conversationHasUnread(conversation: ConversationSummary): boolean {
  if ((conversation.unread_count ?? 0) > 0) return true;
  return (conversation.messages || []).some(
    (message) => !message.is_mine && !message.is_read,
  );
}

function sameMessageFingerprint(
  a: ConversationMessage[] | undefined,
  b: ConversationMessage[] | undefined,
): boolean {
  const left = a || [];
  const right = b || [];
  if (left.length !== right.length) return false;
  if (left.length === 0) return true;
  const lastLeft = left[left.length - 1];
  const lastRight = right[right.length - 1];
  return lastLeft.id === lastRight.id && lastLeft.body === lastRight.body;
}

export default function MessagesWorkspace({ role }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = Number(searchParams.get("c") || "");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const activeIdRef = useRef<number | null>(
    Number.isFinite(requestedId) && requestedId > 0 ? requestedId : null,
  );
  const detailRequestRef = useRef(0);
  const sendLockRef = useRef(false);

  const [conversations, setConversations] = useState<ConversationSummary[]>(
    [],
  );
  const [listError, setListError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(
    Number.isFinite(requestedId) && requestedId > 0 ? requestedId : null,
  );
  const [active, setActive] = useState<ConversationSummary | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingSuggestion, setSendingSuggestion] = useState<string | null>(
    null,
  );
  const [sendError, setSendError] = useState<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(
    Number.isFinite(requestedId) && requestedId > 0,
  );

  const suggestions =
    role === "customer"
      ? CUSTOMER_MESSAGE_SUGGESTIONS
      : OWNER_MESSAGE_SUGGESTIONS;

  const basePath = role === "customer" ? "/customer/messages" : "/owner/messages";

  const loadList = useCallback(async () => {
    const result = await getConversations();
    setConversations(result.conversations);
    setListError(result.error);
    setLoadingList(false);
  }, []);

  const loadDetail = useCallback(async (id: number, quiet = false) => {
    const requestId = ++detailRequestRef.current;
    if (!quiet) setLoadingDetail(true);

    const result = await getConversation(id);

    // Ignore stale responses after conversation switch / newer poll.
    if (requestId !== detailRequestRef.current || activeIdRef.current !== id) {
      return;
    }

    if (!result.ok) {
      if (!quiet) {
        setDetailError(result.error);
        setActive(null);
        setLoadingDetail(false);
      }
      return;
    }

    setDetailError(null);
    setActive((prev) => {
      if (
        prev &&
        prev.id === result.conversation.id &&
        sameMessageFingerprint(prev.messages, result.conversation.messages) &&
        (prev.unread_count ?? 0) === (result.conversation.unread_count ?? 0)
      ) {
        return prev;
      }
      return result.conversation;
    });
    setLoadingDetail(false);

    if (conversationHasUnread(result.conversation)) {
      await markConversationRead(id);
      if (activeIdRef.current !== id) return;
      setConversations((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, unread_count: 0 } : item,
        ),
      );
      setActive((prev) =>
        prev && prev.id === id ? { ...prev, unread_count: 0 } : prev,
      );
    } else if (!quiet) {
      setConversations((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, unread_count: 0 } : item,
        ),
      );
    }
  }, []);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!activeId) {
      setActive(null);
      return;
    }
    void loadDetail(activeId);
  }, [activeId, loadDetail]);

  // Lightweight polling while the Messages UI is mounted.
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let inFlight = false;

    const poll = async () => {
      if (cancelled || document.hidden || inFlight) return;
      inFlight = true;
      try {
        await loadList();
        const id = activeIdRef.current;
        if (!cancelled && id) {
          await loadDetail(id, true);
        }
      } finally {
        inFlight = false;
      }
    };

    const startInterval = () => {
      if (timer != null) window.clearInterval(timer);
      timer = window.setInterval(() => {
        void poll();
      }, POLL_MS);
    };

    const onResume = () => {
      if (document.hidden) return;
      void poll();
      startInterval();
    };

    startInterval();
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);

    return () => {
      cancelled = true;
      if (timer != null) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
    };
  }, [activeId, loadDetail, loadList]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages?.length, activeId]);

  const selectConversation = (id: number) => {
    setActiveId(id);
    setMobileShowThread(true);
    setSendError(null);
    router.replace(`${basePath}?c=${id}`, { scroll: false });
  };

  const appendSentMessage = (message: ConversationMessage) => {
    setActive((prev) => {
      if (!prev) return prev;
      const existing = prev.messages || [];
      if (existing.some((item) => item.id === message.id)) {
        return prev;
      }
      const messages = [...existing, message];
      return {
        ...prev,
        messages,
        latest_message: message,
        updated_at: message.created_at,
      };
    });
    void loadList();
  };

  const handleSend = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!activeId || sendLockRef.current) return;
    const body = draft.trim();
    if (!body) {
      setSendError("Write a message before sending.");
      return;
    }
    sendLockRef.current = true;
    setSending(true);
    setSendError(null);
    const result = await sendMessage(activeId, body);
    setSending(false);
    sendLockRef.current = false;
    if (!result.ok) {
      setSendError(result.error);
      return;
    }
    setDraft("");
    appendSentMessage(result.message);
  };

  const handleQuickSend = async (text: string) => {
    if (!activeId || sendLockRef.current) return;
    const body = text.trim();
    if (!body) return;

    sendLockRef.current = true;
    setSendingSuggestion(text);
    setSendError(null);
    const result = await sendMessage(activeId, body);
    setSendingSuggestion(null);
    sendLockRef.current = false;

    if (!result.ok) {
      setSendError(result.error);
      return;
    }
    appendSentMessage(result.message);
  };

  const isBusy = sending || sendingSuggestion !== null;

  const emptyCopy =
    role === "customer"
      ? {
          title: "No conversations yet",
          description:
            "When an owner accepts your property request, you can message them here.",
          ctaHref: "/customer/requests",
          ctaLabel: "Open My Requests",
        }
      : {
          title: "No conversations yet",
          description:
            "Accept a customer request to start a conversation about your property.",
          ctaHref: "/owner/requests",
          ctaLabel: "Open Requests",
        };

  const messages: ConversationMessage[] = useMemo(
    () => active?.messages || [],
    [active?.messages],
  );

  // Starters only — hide once this conversation already has messages.
  const showQuickTemplates = Boolean(active) && messages.length === 0;

  return (
    <OwnerPageMotion>
      <header className="reveal-item border-b border-line pb-8">
        <p className="eyebrow text-accent">Messages</p>
        <h1 className="display mt-3 text-[clamp(2.1rem,4.5vw,3.25rem)] text-ink">
          Conversations
        </h1>
        <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-ink-soft">
          Private messages about accepted property requests.
        </p>
      </header>

      {listError ? (
        <div className="form-error reveal-item mt-8">{listError}</div>
      ) : null}

      {!loadingList && !listError && conversations.length === 0 ? (
        <div className="mt-10">
          <OwnerEmptyState {...emptyCopy} />
        </div>
      ) : null}

      {conversations.length > 0 || loadingList ? (
        <div className="messages-shell reveal-item mt-10 border border-line bg-bg-raised">
          <aside
            className={`messages-list ${
              mobileShowThread ? "is-hidden-mobile" : ""
            }`}
          >
            <div className="border-b border-line px-4 py-3">
              <p className="eyebrow">Inbox</p>
            </div>
            {loadingList ? (
              <p className="px-4 py-8 text-sm text-ink-muted">Loading…</p>
            ) : (
              <ul className="messages-list__items">
                {conversations.map((item) => {
                  const selected = item.id === activeId;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`messages-list__item${
                          selected ? " is-active" : ""
                        }${item.unread_count > 0 ? " is-unread" : ""}`}
                        onClick={() => selectConversation(item.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm text-ink">
                            {item.other_participant?.name || "Conversation"}
                          </p>
                          {item.unread_count > 0 ? (
                            <span className="messages-unread">
                              {item.unread_count}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-xs text-ink-soft">
                          {item.property.title}
                        </p>
                        <p className="mt-2 line-clamp-2 text-xs font-light text-ink-muted">
                          {item.latest_message?.body || "No messages yet"}
                        </p>
                        <p className="mt-2 text-[0.65rem] tracking-[0.02em] text-ink-muted">
                          {formatRequestDate(item.updated_at)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <section
            className={`messages-thread ${
              mobileShowThread ? "is-visible-mobile" : ""
            }`}
          >
            {!activeId ? (
              <div className="flex h-full min-h-[22rem] items-center justify-center px-6 text-center">
                <p className="max-w-xs text-sm font-light text-ink-muted">
                  Select a conversation to read and reply.
                </p>
              </div>
            ) : (
              <>
                <div className="messages-thread__header">
                  <button
                    type="button"
                    className="nav-link mb-3 lg:hidden"
                    onClick={() => {
                      setMobileShowThread(false);
                      router.replace(basePath, { scroll: false });
                    }}
                  >
                    ← Conversations
                  </button>
                  {loadingDetail && !active ? (
                    <p className="text-sm text-ink-muted">Loading…</p>
                  ) : detailError ? (
                    <p className="form-error">{detailError}</p>
                  ) : active ? (
                    <>
                      <p className="eyebrow text-accent">
                        {role === "customer" ? "Owner" : "Customer"}
                      </p>
                      <h2 className="display mt-2 text-2xl text-ink sm:text-3xl">
                        {active.other_participant?.name || "Conversation"}
                      </h2>
                      <p className="mt-2 text-sm font-light text-ink-soft">
                        {active.property.title}
                        {active.property.location
                          ? ` · ${active.property.location}`
                          : ""}
                      </p>
                    </>
                  ) : null}
                </div>

                <div className="messages-thread__body">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message-bubble${
                        message.is_mine ? " is-mine" : " is-theirs"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.body}</p>
                      <p className="message-bubble__meta">
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                <div className="messages-thread__composer">
                  {showQuickTemplates ? (
                    <div className="messages-suggestions">
                      {suggestions.map((text) => {
                        const isThisSending = sendingSuggestion === text;
                        return (
                          <button
                            key={text}
                            type="button"
                            className="messages-suggestion"
                            onClick={() => void handleQuickSend(text)}
                            disabled={isBusy || !active}
                            aria-busy={isThisSending}
                          >
                            {isThisSending ? "Sending…" : text}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <form
                    onSubmit={(event) => void handleSend(event)}
                    className={`flex flex-col gap-3${
                      showQuickTemplates ? " mt-4" : ""
                    }`}
                  >
                    {sendError ? (
                      <p className="field-error" role="alert">
                        {sendError}
                      </p>
                    ) : null}
                    <textarea
                      ref={composerRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={3}
                      placeholder="Write your message…"
                      disabled={isBusy || !active}
                      className="messages-input"
                    />
                    <button
                      type="submit"
                      className="btn btn-primary w-fit"
                      disabled={isBusy || !active || !draft.trim()}
                    >
                      {sending ? "Sending…" : "Send"}
                    </button>
                  </form>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </OwnerPageMotion>
  );
}
