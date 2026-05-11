/**
 * Ergonomic shortcuts over the auto-generated `api.ts`.
 *
 * `components['schemas'][...]` is verbose at the callsite — re-export the
 * DTO shapes you actually use as plain names. When a new endpoint/DTO is
 * added on the backend, run `npm run generate:types` and add it here.
 *
 * Long-term, the legacy hand-written types in `./index.ts` should be
 * migrated to these generated equivalents.
 */
import type { components, operations } from './api'

type Schemas = components['schemas']

// Response DTOs
export type ApiUser = Schemas['UserResponseDto']
export type ApiAuthResponse = Schemas['AuthResponseDto']
export type ApiWord = Schemas['WordResponseDto']
export type ApiDailyWord = Schemas['DailyWordResponseDto']
export type ApiReviewResult = Schemas['ReviewResultDto']
export type ApiStartTestResponse = Schemas['StartTestResponseDto']
export type ApiSubmitTestResponse = Schemas['SubmitTestResponseDto']
export type ApiTestQuestion = Schemas['TestQuestionDto']
export type ApiProgress = Schemas['ProgressResponseDto']

// Request DTOs
export type ApiLoginRequest = Schemas['LoginDto']
export type ApiRegisterRequest = Schemas['RegisterDto']
export type ApiUpdateUserRequest = Schemas['UpdateUserDto']
export type ApiChangePasswordRequest = Schemas['ChangePasswordDto']
export type ApiCreateWordRequest = Schemas['CreateWordDto']
export type ApiReviewWordRequest = Schemas['ReviewWordDto']
export type ApiSubmitTestRequest = Schemas['SubmitTestDto']

// Error envelope
export type ApiErrorBody = Schemas['ApiErrorResponseDto']

// All operations (useful for query/path param inference)
export type ApiOperations = operations
