import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Message } from '@/core/types';

interface UseMessagesResult {
	messages: Message[];
	loading: boolean;
	error: string | null;
	hasOlder: boolean;
	loadOlder: () => Promise<void>;
	refetch: () => Promise<void>;
}

export function useMessages(chatId: string | null, windowSize: number = 50): UseMessagesResult {
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [hasOlder, setHasOlder] = useState<boolean>(false);
	const oldestNumberRef = useRef<number | null>(null);
	const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

	const mapDbToMessage = (db: any): Message => ({
		id: db.id,
		chat_id: db.chat_id,
		role: db.role,
		text: db.text,
		createdAt: db.created_at,
		meta: db.meta,
		client_msg_id: db.client_msg_id,
		status: db.status,
		context_injected: db.context_injected,
	});

	const fetchLastN = async () => {
		if (!chatId) return;
		setLoading(true);
		setError(null);
		try {
			const { data, error } = await supabase
				.from('messages')
				.select('id, chat_id, role, text, created_at, meta, client_msg_id, status, context_injected, message_number')
				.eq('chat_id', chatId)
				.order('message_number', { ascending: false })
				.limit(windowSize);

			if (error) throw error;

			const mapped = (data || []).map(mapDbToMessage).reverse();
			setMessages(mapped);
			oldestNumberRef.current = data && data.length > 0 ? data[data.length - 1].message_number : null;
			setHasOlder((data?.length || 0) === windowSize);
		} catch (e: any) {
			setError(e?.message || 'Failed to load messages');
		} finally {
			setLoading(false);
		}
	};

	const loadOlder = async () => {
		if (!chatId || oldestNumberRef.current == null) return;
		try {
			const { data, error } = await supabase
				.from('messages')
				.select('id, chat_id, role, text, created_at, meta, client_msg_id, status, context_injected, message_number')
				.eq('chat_id', chatId)
				.lt('message_number', oldestNumberRef.current)
				.order('message_number', { ascending: false })
				.limit(windowSize);

			if (error) throw error;

			const mapped = (data || []).map(mapDbToMessage).reverse();
			setMessages(prev => {
				const combined = [...mapped, ...prev];
				return combined;
			});
			oldestNumberRef.current = data && data.length > 0 ? data[data.length - 1].message_number : oldestNumberRef.current;
			setHasOlder((data?.length || 0) === windowSize);
		} catch (e) {
			// swallow
		}
	};

	// subscribe to realtime for INSERT/UPDATE
	useEffect(() => {
		// cleanup existing
		if (channelRef.current) {
			supabase.removeChannel(channelRef.current);
			channelRef.current = null;
		}
		setMessages([]);
		oldestNumberRef.current = null;

		if (!chatId) return;
		fetchLastN();

		const channel = supabase
			.channel(`useMessages:${chatId}`)
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (payload) => {
				const newMsg = mapDbToMessage(payload.new);
				setMessages(prev => {
					// dedupe by id
					if (prev.find(m => m.id === newMsg.id)) return prev;
					const next = [...prev, newMsg];
					// cap window to windowSize (keep most recent at bottom)
					if (next.length > windowSize) {
						return next.slice(next.length - windowSize);
					}
					return next;
				});
			})
			.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (payload) => {
				const upd = mapDbToMessage(payload.new);
				setMessages(prev => prev.map(m => (m.id === upd.id ? upd : m)));
			})
			.subscribe();

		channelRef.current = channel;

		return () => {
			if (channelRef.current) {
				supabase.removeChannel(channelRef.current);
				channelRef.current = null;
			}
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [chatId, windowSize]);

	return { messages, loading, error, hasOlder, loadOlder, refetch: fetchLastN };
}
