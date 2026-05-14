import { useCallback, useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import VpnLockIcon from '@mui/icons-material/VpnLock';

import { getCloudflaredStatus, removeCloudflaredToken, startCloudflared, stopCloudflared, updateCloudflaredConfig } from 'api/settings';

const defaultStatus = {
  installed: false,
  path: '',
  running: false,
  enabled: false,
  hasToken: false,
  maskedToken: '',
  lastMessage: '',
  lastError: '',
  commandLabel: 'cloudflared tunnel --no-autoupdate run'
};

export default function CloudflareTunnelSettings({ showMessage }) {
  const [status, setStatus] = useState(defaultStatus);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState('');

  const fetchStatus = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }
      try {
        const response = await getCloudflaredStatus();
        setStatus({ ...defaultStatus, ...(response.data || {}) });
      } catch (error) {
        showMessage('获取 Cloudflare Tunnel 状态失败: ' + (error.response?.data?.msg || error.message), 'error');
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [showMessage]
  );

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!status.running) {
      return undefined;
    }
    const timer = window.setInterval(() => fetchStatus({ silent: true }), 4000);
    return () => window.clearInterval(timer);
  }, [fetchStatus, status.running]);

  const runAction = async (name, handler) => {
    setAction(name);
    try {
      const response = await handler();
      setStatus({ ...defaultStatus, ...(response.data || {}) });
      return response;
    } finally {
      setAction('');
    }
  };

  const handleSave = async (event) => {
    event?.preventDefault();
    setSaving(true);
    try {
      const response = await updateCloudflaredConfig({ enabled: status.enabled, token: token.trim() });
      setStatus({ ...defaultStatus, ...(response.data || {}) });
      setToken('');
      showMessage('Cloudflare Tunnel 配置已保存');
    } catch (error) {
      showMessage('保存失败: ' + (error.response?.data?.msg || error.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (event) => {
    event?.preventDefault();
    try {
      await runAction('start', () => startCloudflared({ token: token.trim() }));
      setToken('');
      showMessage('cloudflared 已启动');
    } catch (error) {
      showMessage('启动失败: ' + (error.response?.data?.msg || error.message), 'error');
    }
  };

  const handleStop = async (event) => {
    event?.preventDefault();
    try {
      await runAction('stop', stopCloudflared);
      showMessage('cloudflared 已停止');
    } catch (error) {
      showMessage('停止失败: ' + (error.response?.data?.msg || error.message), 'error');
    }
  };

  const handleRemoveToken = async (event) => {
    event?.preventDefault();
    try {
      await runAction('remove', removeCloudflaredToken);
      setToken('');
      showMessage('Cloudflare Tunnel token 已清除');
    } catch (error) {
      showMessage('清除失败: ' + (error.response?.data?.msg || error.message), 'error');
    }
  };

  const handleRefresh = async (event) => {
    event?.preventDefault();
    setAction('refresh');
    try {
      await fetchStatus({ silent: true });
    } finally {
      setAction('');
    }
  };

  const canStart = status.installed && !status.running && (status.hasToken || token.trim());

  return (
    <Card variant="outlined">
      <CardHeader
        title="Cloudflare Tunnel"
        subheader="通过本机 cloudflared 将当前 SublinkPro 实例连接到 Cloudflare Zero Trust Tunnel。"
        avatar={<CloudQueueIcon color="primary" />}
        action={
          <Tooltip title="刷新状态">
            <IconButton type="button" onClick={handleRefresh} disabled={loading || Boolean(action)}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        }
      />
      <CardContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Stack spacing={2.5} sx={{ maxWidth: 760 }}>
            <Alert severity="info">
              请先在 Cloudflare Zero Trust 中创建 remotely-managed Tunnel，然后粘贴安装命令中的 token。系统会调用已安装的
              cloudflared，并在内部安全传递 token，避免在进程参数中直接暴露 token。
            </Alert>

            {!status.installed && (
              <Alert
                severity="warning"
                sx={{ color: (theme) => (theme.palette.mode === 'dark' ? theme.palette.warning.main : theme.palette.warning.dark) }}
              >
                当前运行环境未检测到 cloudflared。Docker 官方镜像会内置 cloudflared；非 Docker 部署需要先安装 cloudflared 并确保命令在 PATH
                中可用。
              </Alert>
            )}

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, bgcolor: 'background.default' }}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2">运行状态</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip
                    size="small"
                    color={status.installed ? 'success' : 'default'}
                    variant="outlined"
                    label={status.installed ? '已安装 cloudflared' : '未安装 cloudflared'}
                  />
                  <Chip
                    size="small"
                    color={status.running ? 'success' : 'default'}
                    variant="outlined"
                    label={status.running ? '运行中' : '未运行'}
                  />
                  <Chip
                    size="small"
                    color={status.enabled ? 'info' : 'default'}
                    variant="outlined"
                    label={status.enabled ? '已启用自动启动' : '未启用自动启动'}
                  />
                  <Chip
                    size="small"
                    color={status.hasToken ? 'success' : 'default'}
                    variant="outlined"
                    label={status.hasToken ? `已保存 token：${status.maskedToken}` : '未保存 token'}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  启动命令：{status.commandLabel}
                </Typography>
                {status.path && (
                  <Typography variant="body2" color="text.secondary">
                    cloudflared 路径：{status.path}
                  </Typography>
                )}
              </Stack>
            </Box>

            <Stack spacing={2}>
              <FormControlLabel
                sx={{ mr: 0 }}
                control={
                  <Switch
                    checked={status.enabled}
                    disabled={status.running}
                    onChange={(e) => setStatus((prev) => ({ ...prev, enabled: e.target.checked }))}
                  />
                }
                label={status.enabled ? '随服务启动自动连接 Tunnel' : '不自动连接 Tunnel'}
              />

              <TextField
                fullWidth
                type="password"
                label="Cloudflare Tunnel Token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={status.hasToken ? '留空则继续使用已保存 token' : '粘贴 cloudflared service install 命令中的 token'}
                helperText="保存或启动时会加密存储 token"
                disabled={status.running}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <VpnLockIcon color="action" />
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Stack>

            {(status.lastMessage || status.lastError) && (
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, bgcolor: 'background.paper' }}>
                <Stack spacing={1}>
                  {status.lastMessage && (
                    <Typography variant="body2" color="text.secondary">
                      最近消息：{status.lastMessage}
                    </Typography>
                  )}
                  {status.lastError && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}
                    >
                      运行日志：{status.lastError}
                    </Typography>
                  )}
                </Stack>
              </Box>
            )}

            <Divider />

            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap">
              <Button
                type="button"
                variant="outlined"
                onClick={handleSave}
                disabled={saving || Boolean(action) || status.running}
                startIcon={<SaveIcon />}
              >
                {saving ? '保存中...' : '保存配置'}
              </Button>
              <Button
                type="button"
                variant="contained"
                onClick={handleStart}
                disabled={!canStart || Boolean(action)}
                startIcon={<PlayArrowIcon />}
              >
                {action === 'start' ? '启动中...' : '启动 cloudflared'}
              </Button>
              <Button
                color="error"
                type="button"
                variant="outlined"
                onClick={handleStop}
                disabled={!status.running || Boolean(action)}
                startIcon={<StopCircleIcon />}
              >
                {action === 'stop' ? '停止中...' : '停止 cloudflared'}
              </Button>
              <Button
                color="error"
                type="button"
                variant="text"
                onClick={handleRemoveToken}
                disabled={!status.hasToken || status.running || Boolean(action)}
                startIcon={<DeleteOutlineIcon />}
              >
                清除 token
              </Button>
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
