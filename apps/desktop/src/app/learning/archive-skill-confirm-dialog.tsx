import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { deleteLearningNode, type ProfileScope } from '@/hermes'
import { type Translations, useI18n } from '@/i18n'
import { type AppBrand, appBrandForEnv } from '@/lib/app-brand'
import { notify } from '@/store/notifications'

export const ARCHIVE_SKILL_DESCRIPTION = 'The skill is archived and can be restored with `hermes curator restore`.'
const ARCHIVE_SKILL_INTERNAL_DESCRIPTION = 'Kỹ năng sẽ được lưu trữ và có thể khôi phục bằng `hermes curator restore`.'

export function notifySkillArchived(t: Translations): void {
  notify({ kind: 'success', message: t.skills.skillArchivedMessage, title: t.skills.skillArchivedTitle })
}

interface ArchiveSkillDialogCopy {
  confirmLabel: string
  description: string
  failureFallback: string
  title: (skillName: string) => string
}

export function archiveSkillDialogCopyForBrand(
  t: Translations,
  brand: AppBrand = appBrandForEnv()
): ArchiveSkillDialogCopy {
  if (brand.mode === 'upstream') {
    return {
      confirmLabel: t.skills.archive,
      description: ARCHIVE_SKILL_DESCRIPTION,
      failureFallback: 'Archive failed',
      title: name => `Archive ${name}?`
    }
  }

  return {
    confirmLabel: 'Lưu trữ',
    description: ARCHIVE_SKILL_INTERNAL_DESCRIPTION,
    failureFallback: 'Không thể lưu trữ',
    title: name => `Lưu trữ ${name}?`
  }
}

export async function archiveLearningSkill(
  id: string,
  profile?: ProfileScope,
  failureFallback = 'Archive failed'
): Promise<void> {
  const res = await deleteLearningNode(id, profile)

  if (!res.ok) {
    throw new Error(res.message || failureFallback)
  }
}

/** Fire-and-forget a mutation whose UI already applied optimistically; a failure just rolls it back + reports. */
export function fireOptimistic(action: Promise<void>, rollback: () => void, onFailure: (err: unknown) => void): void {
  void action.catch(err => {
    rollback()
    onFailure(err)
  })
}

interface ArchiveSkillConfirmDialogProps {
  /** Apply optimistic UI updates; return rollback if the background archive fails. */
  onApply: () => () => void
  onClose: () => void
  onFailure?: (err: unknown, skillName: string) => void
  onSuccess?: () => void
  open: boolean
  /** Capabilities profile-scope override — archive against THIS profile's
   *  backend; undefined/null keeps the app-wide active profile. */
  profile?: ProfileScope
  skillId: string
  skillName: string
}

/** Shared archive confirm for learned skills (capabilities page + memory graph). */
export function ArchiveSkillConfirmDialog({
  onApply,
  onClose,
  onFailure,
  onSuccess,
  open,
  profile,
  skillId,
  skillName
}: ArchiveSkillConfirmDialogProps) {
  const { t } = useI18n()
  const copy = archiveSkillDialogCopyForBrand(t)

  return (
    <ConfirmDialog
      confirmLabel={copy.confirmLabel}
      description={copy.description}
      destructive
      dismissOnConfirm
      onClose={onClose}
      onConfirm={() => {
        const rollback = onApply()

        fireOptimistic(
          archiveLearningSkill(skillId, profile, copy.failureFallback).then(() => {
            notifySkillArchived(t)
            onSuccess?.()
          }),
          rollback,
          err => onFailure?.(err, skillName)
        )
      }}
      open={open}
      title={copy.title(skillName)}
    />
  )
}
