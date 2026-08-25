// 角色 API（Phase 2 已实现 · 8/23 前后端闭环 ✓）
import { api } from './client'

// 4 个可选角色：[{ id, name, asset_key, sprite_url, description }]
export const fetchCharacterOptions = () =>
  api.get('/character/options').then((r) => r.data)

// 选择角色：{ character_id } → 触发 LLM 生成 ai_name/ai_personality/ai_advice
export const chooseCharacter = (characterId) =>
  api.post('/character/choose', { character_id: characterId }).then((r) => r.data)

// 我的角色（含 LLM 生成字段）
export const fetchMyCharacter = () =>
  api.get('/character/me').then((r) => r.data)
