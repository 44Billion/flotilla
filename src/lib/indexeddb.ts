import {openDB, deleteDB} from "idb"
import type {IDBPDatabase} from "idb"
import type {Maybe} from "@welshman/lib"

export type IDBStore = {
  name: string
  keyPath: string
}

export type IDBOptions = {
  name: string
  version: number
  stores: IDBStore[]
}

export class IDB {
  connection: Maybe<Promise<IDBPDatabase>>
  failedToConnect = false

  constructor(readonly options: IDBOptions) {}

  async connect() {
    if (!this.failedToConnect && !this.connection) {
      const {name, version, stores} = this.options

      try {
        this.connection = openDB(name, version, {
          upgrade(idbDb: IDBPDatabase) {
            const names = new Set(stores.map(store => store.name))

            for (const table of idbDb.objectStoreNames) {
              if (!names.has(table)) {
                idbDb.deleteObjectStore(table)
              }
            }

            for (const {name, keyPath} of stores) {
              try {
                idbDb.createObjectStore(name, {keyPath})
              } catch (e) {
                console.warn(e)
              }
            }
          },
          blocked() {},
          blocking() {},
        })
      } catch (e) {
        console.error("Failed to connect to indexeddb", e)
        this.failedToConnect = true
      }
    }

    return this.connection
  }

  table = <T>(name: string) => new IDBTable<T>(this, name)

  getAll = async <T>(table: string): Promise<T[]> => {
    const connection = await this.connect()

    if (!connection) return []

    const tx = connection.transaction(table, "readonly")
    const store = tx.objectStore(table)
    const result = await store.getAll()

    await tx.done

    return result || []
  }

  bulkPut = async <T>(table: string, data: Iterable<T>) => {
    const connection = await this.connect()

    if (!connection) return

    const tx = connection.transaction(table, "readwrite")
    const store = tx.objectStore(table)

    await Promise.all(
      Array.from(data).map(item => {
        try {
          store.put(item)
        } catch (e) {
          console.error(e, item)
        }
      }),
    )

    await tx.done
  }

  bulkDelete = async (table: string, ids: Iterable<string>) => {
    const connection = await this.connect()

    if (!connection) return

    const tx = connection.transaction(table, "readwrite")
    const store = tx.objectStore(table)

    await Promise.all(Array.from(ids).map(id => store.delete(id)))
    await tx.done
  }

  close = () => {
    this.connection?.then(c => c.close())
    this.connection = undefined
  }

  clear = async () => {
    await this.connection?.then(c => c.close())
    await deleteDB(this.options.name, {
      blocked() {},
    })
  }
}

export class IDBTable<T> {
  constructor(
    readonly db: IDB,
    readonly name: string,
  ) {}

  getAll = () => this.db.getAll<T>(this.name)

  bulkPut = (data: Iterable<T>) => this.db.bulkPut(this.name, data)

  bulkDelete = (ids: Iterable<string>) => this.db.bulkDelete(this.name, ids)
}
