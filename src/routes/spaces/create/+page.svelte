<script lang="ts">
  import CloudCheck from "@assets/icons/cloud-check.svg?dataurl"
  import CheckCircle from "@assets/icons/check-circle.svg?dataurl"
  import ArrowRight from "@assets/icons/arrow-right.svg?dataurl"
  import Link from "@lib/components/Link.svelte"
  import Icon from "@lib/components/Icon.svelte"
  import Page from "@lib/components/Page.svelte"
  import PageHeader from "@lib/components/PageHeader.svelte"
  import PageContent from "@lib/components/PageContent.svelte"
</script>

<Page>
  <PageContent class="flex flex-col items-center gap-2 p-2 sm:gap-4 sm:p-4">
    <PageHeader>
      {#snippet title()}
        <div>Choose your Hosting Plan</div>
      {/snippet}
      {#snippet info()}
        <p>
          Select how you want to deploy and manage your new Space. You can always migrate later.
        </p>
      {/snippet}
    </PageHeader>
    <div class="flex w-full max-w-lg flex-col gap-4 lg:max-w-4xl">
      <div class="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div class="card2 flex flex-col gap-5">
          <div class="flex flex-col gap-3">
            <div class="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-md">
              <Icon icon={CloudCheck} class="text-primary" />
            </div>
            <div class="flex flex-col gap-1">
              <h3 class="text-lg font-bold">Community</h3>
              <div class="text-xs font-semibold tracking-wider opacity-60">SELF-HOSTED</div>
            </div>
            <p class="text-sm opacity-70">
              For technical users who want full control. Deploy on your own infrastructure and
              manage your own updates and scaling.
            </p>
          </div>
          <ul class="flex flex-col gap-2 text-sm">
            <li class="flex items-center gap-2">
              <Icon icon={CheckCircle} class="opacity-60" />
              Open source core
            </li>
            <li class="flex items-center gap-2">
              <Icon icon={CheckCircle} class="opacity-60" />
              Community support
            </li>
            <li class="flex items-center gap-2">
              <Icon icon={CheckCircle} class="opacity-60" />
              Bring your own infra
            </li>
          </ul>
          <Link
            external
            class="btn btn-neutral mt-auto"
            href="https://gitea.coracle.social/coracle/zooid">
            Get started
            <Icon icon={ArrowRight} />
          </Link>
        </div>
        <div class="card2 border-primary flex flex-col gap-5 border">
          <div class="flex flex-col gap-3">
            <div class="flex items-start justify-between">
              <img alt="Coracle Logo" src="/coracle.png" class="h-10 w-10" />
              <div class="badge badge-primary">Recommended</div>
            </div>
            <div class="flex flex-col gap-1">
              <h3 class="text-lg font-bold">Coracle Hosting</h3>
              <div class="text-xs font-semibold tracking-wider opacity-60">FULLY MANAGED</div>
            </div>
            <p class="text-sm opacity-70">
              The premium experience. We handle the infrastructure, security updates, and scaling so
              you can focus on your community.
            </p>
          </div>
          <ul class="flex flex-col gap-2 text-sm">
            <li class="flex items-center gap-2">
              <Icon icon={CheckCircle} class="text-primary" />
              One-click deployment
            </li>
            <li class="flex items-center gap-2">
              <Icon icon={CheckCircle} class="text-primary" />
              Automated backups & scaling
            </li>
            <li class="flex items-center gap-2">
              <Icon icon={CheckCircle} class="text-primary" />
              Priority support
            </li>
          </ul>
          <Link external class="btn btn-primary mt-auto" href="https://hosting.coracle.social">
            Start for free
            <Icon icon={ArrowRight} />
          </Link>
        </div>
      </div>
      <div class="flex flex-col items-center justify-center gap-2 py-2 text-sm opacity-70">
        <span>Want to host on other servers?</span>
        <Link external class="link center gap-1" href="https://relay.tools/signup">
          Other hosting options
          <Icon icon={ArrowRight} />
        </Link>
      </div>
    </div>
  </PageContent>
</Page>
