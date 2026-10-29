import type { CompanionChunk } from '@/lib/types/ai';
import { emptyStreamingText, applyStreamChunk, toDisplayText } from '@/lib/ai-streaming';

function delta(content: string): CompanionChunk {
  return { type: 'text_delta' as any, data: { content } };
}

function text(content: string, final = false): CompanionChunk {
  return { type: 'text', data: { content, final } };
}

function other(type: string): CompanionChunk {
  return { type: type as any, data: { content: 'ignored' } };
}

describe('ai-streaming text accumulator', () => {
  it('starts empty', () => {
    expect(emptyStreamingText()).toEqual({ prefix: '', streamed: '' });
    expect(toDisplayText(emptyStreamingText())).toBe('');
  });

  it('appends each text_delta in arrival order', () => {
    let s = emptyStreamingText();
    s = applyStreamChunk(s, delta('Thu '));
    s = applyStreamChunk(s, delta('vien '));
    s = applyStreamChunk(s, delta('mo cua.'));

    expect(s.streamed).toBe('Thu vien mo cua.');
    expect(toDisplayText(s)).toBe('Thu vien mo cua.');
  });

  it('REPLACES streamed text on the authoritative final chunk (delta + final must not double)', () => {
    let s = emptyStreamingText();
    s = applyStreamChunk(s, delta('Thu '));
    s = applyStreamChunk(s, delta('vien mo cua.'));
    s = applyStreamChunk(s, text('Thu vien mo cua.', true));

    expect(toDisplayText(s)).toBe('Thu vien mo cua.');
    expect(toDisplayText(s)).not.toContain('Thu Thu');
    expect(toDisplayText(s)).not.toContain('mo cua.moo cua.');
  });

  it('preserves a non-final text chunk as a stable prefix (e.g. the [Voice] transcript)', () => {
    let s = emptyStreamingText();
    s = applyStreamChunk(s, text('[Voice] sach react'));
    s = applyStreamChunk(s, delta('Toi tim thay.'));

    expect(s.prefix).toBe('[Voice] sach react');
    expect(toDisplayText(s)).toBe('[Voice] sach reactToi tim thay.');
  });

  it('keeps the prefix when the final answer replaces only the streamed part', () => {
    let s = emptyStreamingText();
    s = applyStreamChunk(s, text('[Voice] sach react'));
    s = applyStreamChunk(s, delta('Toi tim thay.'));
    s = applyStreamChunk(s, text('Toi tim thay.', true));

    expect(toDisplayText(s)).toBe('[Voice] sach reactToi tim thay.');
    expect(toDisplayText(s)).not.toContain('Toi tim thay.Toi tim thay.');
  });

  it('never strips a surviving prefix when a later final text arrives', () => {
    let s = emptyStreamingText();
    s = applyStreamChunk(s, text('Lead in. '));
    s = applyStreamChunk(s, delta('Answer'));
    s = applyStreamChunk(s, text('Answer', true));

    expect(toDisplayText(s)).toBe('Lead in. Answer');
  });

  it('ignores non-text chunks (audio, viseme, tool_result, companion_done)', () => {
    let s = emptyStreamingText();
    s = applyStreamChunk(s, delta('A'));

    for (const type of ['audio', 'viseme', 'tool_result', 'companion_done']) {
      s = applyStreamChunk(s, other(type));
    }

    expect(toDisplayText(s)).toBe('A');
    expect(s).toEqual({ prefix: '', streamed: 'A' });
  });

  it('tolerates a missing content field without producing "undefined"', () => {
    let s = emptyStreamingText();
    s = applyStreamChunk(s, { type: 'text_delta', data: {} } as CompanionChunk);
    s = applyStreamChunk(s, { type: 'text', data: {} } as CompanionChunk);

    expect(toDisplayText(s)).toBe('');
    expect(toDisplayText(s)).not.toContain('undefined');
  });

  it('is idempotent for a final chunk that repeats already-streamed content', () => {
    const final = text('Xin chao ban!', true);
    const base = applyStreamChunk(emptyStreamingText(), delta('Xin '));

    const once = applyStreamChunk(applyStreamChunk(base, delta('chao ban!')), final);
    const twice = applyStreamChunk(applyStreamChunk(base, delta('chao ban!')), final);

    expect(toDisplayText(once)).toBe(toDisplayText(twice));
    expect(toDisplayText(once)).toBe('Xin chao ban!');
  });
});
