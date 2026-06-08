<script lang="ts">
  import type {Profile} from "@welshman/util"
  import {makeProfile} from "@welshman/util"
  import {pubkey, profilesByPubkey, waitForThunkError} from "@welshman/app"
  import AltArrowLeft from "@assets/icons/alt-arrow-left.svg?dataurl"
  import {errorMessage} from "@lib/util"
  import Icon from "@lib/components/Icon.svelte"
  import Button from "@lib/components/Button.svelte"
  import Spinner from "@lib/components/Spinner.svelte"
  import ProfileEditForm from "@app/components/ProfileEditForm.svelte"
  import {clearModals} from "@app/modal"
  import {pushToast} from "@app/toast"
  import {updateProfile} from "@app/profiles"

  const profile = $profilesByPubkey.get($pubkey!) || makeProfile()
  const initialValues = {profile}

  const back = () => history.back()

  const onsubmit = async ({profile}: {profile: Profile}) => {
    loading = true

    try {
      const error = await waitForThunkError(updateProfile({profile}))

      if (error) {
        pushToast({
          theme: "error",
          message: `Failed to update your profile: ${errorMessage(error)}`,
        })
      } else {
        pushToast({message: "Your profile has been updated!"})
        clearModals()
      }
    } finally {
      loading = false
    }
  }

  let loading = $state(false)
</script>

<ProfileEditForm {initialValues} {onsubmit}>
  {#snippet footer()}
    <Button class="btn btn-link" onclick={back}>
      <Icon icon={AltArrowLeft} />
      Go Back
    </Button>
    <Button type="submit" class="btn btn-primary" disabled={loading}>
      <Spinner {loading} />
      Save Changes
    </Button>
  {/snippet}
</ProfileEditForm>
