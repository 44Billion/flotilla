import {withGetter} from "@welshman/store"
import {writable} from "svelte/store"
import {randomId} from "@welshman/lib"

export const device = withGetter(writable(randomId()))
