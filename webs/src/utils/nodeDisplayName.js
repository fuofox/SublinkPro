export const getNodeDisplayName = (node) => {
  if (!node) return '未知节点';

  if (node.PreviewName) {
    return node.PreviewName;
  }

  if (node.EffectiveName) {
    return node.EffectiveName;
  }

  if (node.NameMode === 'remark' && node.Name) {
    return node.Name;
  }

  if (node.NameMode === 'link' && node.LinkName) {
    return node.LinkName;
  }

  return node.Name || node.LinkName || node.OriginalName || '未知节点';
};
