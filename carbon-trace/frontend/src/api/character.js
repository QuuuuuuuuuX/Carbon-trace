// 角色 API（Phase 2 · 后端 8/25 起实现，当前 501 stub）
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
