import { Type, type Static } from '@sinclair/typebox'

export const ExecuteBody = Type.Object({
  url: Type.String({ format: 'uri' }),
  method: Type.Union([
    Type.Literal('GET'),
    Type.Literal('POST'),
    Type.Literal('PUT'),
    Type.Literal('PATCH'),
    Type.Literal('DELETE'),
  ]),
  headers: Type.Optional(Type.Record(Type.String(), Type.String())),
  body: Type.Optional(Type.String()),
  apiKey: Type.Optional(Type.String()),
})

export type ExecuteBodyType = Static<typeof ExecuteBody>

export const ExecuteResponse = Type.Object({
  status: Type.Number(),
  headers: Type.Record(Type.String(), Type.String()),
  body: Type.String(),
})

export const ErrorResponse = Type.Object({
  error: Type.String(),
  detail: Type.Optional(Type.String()),
})
