export function shouldAllowRendererNavigation(
  url: string,
  rendererUrl: string | undefined,
): boolean {
  if (rendererUrl === undefined || rendererUrl.length === 0) {
    return false;
  }
  return url === rendererUrl || url.startsWith(rendererUrl);
}
