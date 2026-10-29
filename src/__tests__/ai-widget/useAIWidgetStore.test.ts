jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    streamCompanionChat: jest.fn(),
    getCommandCenterSummary: jest.fn(),
    getAIStaffContext: jest.fn(),
    getAIConversations: jest.fn(),
    getAIInsights: jest.fn(),
    getProactiveMessage: jest.fn(),
    getMotivationalNudge: jest.fn(),
    getPendingActions: jest.fn(),
    approvePendingAction: jest.fn(),
    rejectPendingAction: jest.fn(),
  },
}));

import type { CompanionChunk } from '@/lib/types/ai';
import api from '@/lib/api-client';
import { useAIWidgetStore } from '@/app/(dashboard)/_components/AIWidget/store/useAIWidgetStore';

const streamMock = api.streamCompanionChat as jest.Mock;

function delta(content: string): CompanionChunk {
  return { type: 'text_delta' as any, data: { content } };
}

function text(content: string, final = false): CompanionChunk {
  return { type: 'text', data: { content, final } };
}

/**
 * Drives the stream chunk by chunk, capturing the rendered assistant text AFTER each
 * chunk so tests can assert what the user saw mid-stream (not just the end state).
 */
async function runStream(chunks: CompanionChunk[], sessionId = 'sess-1'): Promise<string[]> {
  const snapshots: string[] = [];

  streamMock.mockImplementation(
    (_message: string, _files: any, _sessionId: any, onChunk: (c: CompanionChunk) => void) => {
      for (const chunk of chunks) {
        onChunk(
          chunk.type === 'companion_done'
            ? { type: chunk.type, data: { ...chunk.data, sessionId } }
            : chunk,
        );
        snapshots.push(assistantMessages().map((m) => m.content).join('|'));
      }
      return Promise.resolve();
    },
  );

  await useAIWidgetStore.getState().sendMessage('Thu vien mo cua gio nao?');
  return snapshots;
}

function assistantMessages() {
  return useAIWidgetStore.getState().messages.filter((m) => m.role === 'assistant');
}

function visibleAssistantText(): string {
  return assistantMessages()
    .map((m) => m.content)
    .join('||');
}

describe('useAIWidgetStore companion streaming', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAIWidgetStore.setState({
      messages: [],
      chatSessionId: undefined,
      isLoadingChat: false,
      companionState: 'idle',
      currentAudio: null,
      visemeData: [],
    });
  });

  it('appends the user message, enters loading/thinking, then settles when the stream closes', async () => {
    let closeStream!: () => void;
    streamMock.mockImplementation(
      () => new Promise<void>((resolve) => { closeStream = resolve; }),
    );

    const pending = useAIWidgetStore.getState().sendMessage('hello');

    const mid = useAIWidgetStore.getState();
    expect(mid.messages[0].role).toBe('user');
    expect(mid.messages[0].content).toBe('hello');
    expect(mid.isLoadingChat).toBe(true);
    expect(mid.companionState).toBe('thinking');

    closeStream();
    await pending;

    const after = useAIWidgetStore.getState();
    expect(after.isLoadingChat).toBe(true); // no companion_done yet => still loading
    expect(after.messages[0].content).toBe('hello');
  });

  it('renders text_delta chunks DURING the stream (token-by-token, before any final text)', async () => {
    const snapshots = await runStream([delta('Thu '), delta('vien '), text('Thu vien', true)]);

    // Snapshots are taken right after each chunk arrives — before the final text exists.
    expect(snapshots[0]).toContain('Thu ');
    expect(snapshots[1]).toContain('vien ');
    expect(snapshots[2]).toContain('Thu vien');
  });

  it('does NOT double the answer when a final text repeats the streamed deltas', async () => {
    const snapshots = await runStream([delta('Thu '), delta('vien mo cua.'), text('Thu vien mo cua.', true)]);

    // Mid-stream the partial answer must already be on screen (token-by-token).
    expect(snapshots[1]).toContain('Thu vien mo cua.');

    const contents = assistantMessages().map((m) => m.content);
    expect(contents).toEqual(['Thu vien mo cua.']);
    expect(contents.join('')).not.toContain('Thu Thu vien');
  });

  it('keeps a non-final text prefix (voice transcript) in front of the streamed answer', async () => {
    const snapshots = await runStream([
      text('[Voice] sach react'),
      delta('Toi tim thay.'),
      text('Toi tim thay.', true),
    ]);

    // After the delta lands, the transcript prefix must already be paired with streamed text.
    expect(snapshots[1]).toContain('[Voice] sach reactToi tim thay.');

    const contents = assistantMessages().map((m) => m.content);
    expect(contents).toEqual(['[Voice] sach reactToi tim thay.']);
    expect(contents.join('')).not.toContain('Toi tim thay.Toi tim thay.');
  });

  it('finalizes the message id and stores the session id from companion_done', async () => {
    await runStream([delta('Xin chao'), text('Xin chao', true), { type: 'companion_done', data: {} }], 'sess-42');

    const state = useAIWidgetStore.getState();
    expect(state.chatSessionId).toBe('sess-42');
    expect(state.isLoadingChat).toBe(false);
    expect(state.companionState).toBe('idle');
    expect(state.messages.some((m) => m.id === 'streaming')).toBe(false);
    expect(state.messages.some((m) => m.role === 'assistant' && m.id.startsWith('assistant-'))).toBe(true);
  });

  it('queues audio and visemes while streaming', async () => {
    await runStream([
      delta('Xin chao'),
      { type: 'audio', data: { audioBase64: 'AAA', durationMs: 10 } },
      { type: 'viseme', data: { visemes: [{ time: 0, value: 1 }] } },
      text('Xin chao', true),
      { type: 'companion_done', data: {} },
    ]);

    const state = useAIWidgetStore.getState();
    expect(state.visemeData).toEqual([{ time: 0, value: 1 }]);
    expect(state.messages.map((m) => m.content)).toContain('Xin chao');
  });

  it('never renders raw tool-call JSON as visible chat text', async () => {
    await runStream([
      delta('Tim thay sach.'),
      text('Tim thay sach.', true),
      { type: 'tool_result', data: { name: 'search_books', result: { success: true } } },
      { type: 'companion_done', data: {} },
    ]);

    expect(visibleAssistantText()).not.toContain('"tool"');
    expect(visibleAssistantText()).not.toContain('search_books');
  });

  it('surfaces a friendly error when the stream fails', async () => {
    streamMock.mockRejectedValue(new Error('network down'));

    await useAIWidgetStore.getState().sendMessage('hi');

    const state = useAIWidgetStore.getState();
    expect(state.isLoadingChat).toBe(false);
    expect(state.companionState).toBe('error');
    expect(assistantMessages().map((m) => m.content).join('')).toContain('Xin lỗi');
  });
});
