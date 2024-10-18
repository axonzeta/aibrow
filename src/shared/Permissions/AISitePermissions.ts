/* **************************************************************************/
// MARK: Permission requests
/* **************************************************************************/

export type SiteModelPermissionRequest = {
  tabId: number
  windowId: number
  frameId: number
  origin: string
  modelId: string
  modelName: string
  modelLicenseUrl: string | null
  resolve?: (res: boolean) => void
  reject?: (err: any) => void
}

/* **************************************************************************/
// MARK: Site permissions
/* **************************************************************************/

const kSitePermissionsKey = 'sitePermissions'

type SitePermission = {
  origin: string
  modelId: string
  permission: boolean
}

function getSiteModelPermissionKey (origin: string, modelId: string) {
  return `${origin}|MODEL:${modelId}`
}

/**
 * Gets the site permission
 * @param origin: the origin of the site
 * @param modelId: the id of the model
 * @returns true for granted, false for denied, undefined for known
 */
export async function getSiteModelPermission (origin: string, modelId: string): Promise<boolean | undefined> {
  const res = await chrome.storage.local.get(kSitePermissionsKey)
  const sitePermissions = res[kSitePermissionsKey] ?? {}
  return sitePermissions[getSiteModelPermissionKey(origin, modelId)]?.permission
}

/**
 * Sets a site permission
 * @param origin: the origin of the site
 * @param modelId: the id of the model
 * @param permission: true for granted, false for denied
 */
export async function setSiteModelPermission (origin: string, modelId: string, permission: boolean | undefined) {
  const res = await chrome.storage.local.get(kSitePermissionsKey)
  const sitePermissions = res[kSitePermissionsKey] ?? {}
  const key = getSiteModelPermissionKey(origin, modelId)
  if (permission === undefined) {
    delete sitePermissions[key]
  } else {
    sitePermissions[key] = { origin, modelId, permission } as SitePermission
  }
  await chrome.storage.local.set({ sitePermissions })
}

/**
 * Gets all the site permissions
 * @returns an array of site permissions
 */
export async function getAllSitePermissions () {
  const res = await chrome.storage.local.get(kSitePermissionsKey)
  return Object.values(res[kSitePermissionsKey] ?? {}) as SitePermission[]
}

/**
 * Gets all the site permissions grouped by origin
 * @returns an array of site permissions grouped by origin
 */
export async function getAllSitePermissionsGroupedByOrigin () {
  const permissions = await getAllSitePermissions()
  const nested: { [key: string]: { origin: string, models: SitePermission[] }} = {}
  for (const permission of permissions) {
    if (!nested[permission.origin]) {
      nested[permission.origin] = {
        origin: permission.origin,
        models: []
      }
    }
    nested[permission.origin].models.push(permission)
  }

  return Object.values(nested)
}
