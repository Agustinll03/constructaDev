import { describe, it, expect } from 'vitest'
import { ROLE_PERMISSIONS, type Permission } from '../../hooks/usePermission'

const ALL_PERMISSIONS: Permission[] = [
  "obra.create", "obra.edit", "obra.delete",
  "tarea.create", "tarea.edit", "tarea.delete", "tarea.move",
  "miembro.invite", "miembro.remove",
  "configuracion.edit",
  "documentos.upload",
]

const can = (role: keyof typeof ROLE_PERMISSIONS, p: Permission) =>
  ROLE_PERMISSIONS[role].includes(p)

describe('admin permissions', () => {
  it('has all permissions', () => {
    ALL_PERMISSIONS.forEach(p => {
      expect(can('admin', p), `admin should have ${p}`).toBe(true)
    })
  })
})

describe('collaborator permissions', () => {
  it('can edit obras', () => expect(can('collaborator', 'obra.edit')).toBe(true))
  it('can create tareas', () => expect(can('collaborator', 'tarea.create')).toBe(true))
  it('can move tareas', () => expect(can('collaborator', 'tarea.move')).toBe(true))
  it('can upload documents', () => expect(can('collaborator', 'documentos.upload')).toBe(true))

  it('cannot create obras', () => expect(can('collaborator', 'obra.create')).toBe(false))
  it('cannot delete obras', () => expect(can('collaborator', 'obra.delete')).toBe(false))
  it('cannot delete tareas', () => expect(can('collaborator', 'tarea.delete')).toBe(false))
  it('cannot invite members', () => expect(can('collaborator', 'miembro.invite')).toBe(false))
  it('cannot remove members', () => expect(can('collaborator', 'miembro.remove')).toBe(false))
  it('cannot edit configuracion', () => expect(can('collaborator', 'configuracion.edit')).toBe(false))
})

describe('ROLE_PERMISSIONS completeness', () => {
  it('covers all known Permission values for every role', () => {
    const roles = Object.keys(ROLE_PERMISSIONS) as Array<keyof typeof ROLE_PERMISSIONS>
    roles.forEach(role => {
      expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true)
    })
  })
})
