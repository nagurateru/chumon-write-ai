import Anthropic from '@anthropic-ai/sdk'

export const CLAUDE_MODEL = 'claude-sonnet-5-5'

// 拡張思考を使わない設定（Sonnet 4.6 時代と同じ挙動・コスト）。SDK v0.105 の型にまだ無いためキャスト
export const NO_THINKING = { type: 'between_tools' } as unknown as Anthropic.ThinkingConfigParam

// レスポンスの最初のテキストブロックを返す（thinking ブロックが先頭に来ても安全）
export function firstText(msg: Anthropic.Message): string | undefined {
  const block = msg.content.find(b => b.type === 'text')
  return block?.type === 'text' ? block.text : undefined
}
