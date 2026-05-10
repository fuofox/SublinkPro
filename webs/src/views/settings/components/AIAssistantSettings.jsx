import { useCallback, useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import CachedIcon from '@mui/icons-material/Cached';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SaveIcon from '@mui/icons-material/Save';
import ScienceIcon from '@mui/icons-material/Science';

import { getAISettings, listAIModels, testAISettings, updateAISettings } from 'api/settings';

const dedupeModelOptions = (models = [], currentModel = '') => {
  const seen = new Set();
  const options = [];

  [currentModel, ...models].forEach((model) => {
    const value = String(model || '').trim();
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    options.push(value);
  });

  return options;
};

const formatAIUsage = (usage) => {
  if (!usage || typeof usage !== 'object' || Array.isArray(usage)) {
    return '';
  }

  return JSON.stringify(usage, null, 2);
};

export default function AIAssistantSettings({ showMessage, loading, setLoading }) {
  const [aiSettingsLoading, setAISettingsLoading] = useState(false);
  const [aiAction, setAIAction] = useState('');
  const [aiHeadersText, setAIHeadersText] = useState('{}');
  const [aiTestResult, setAITestResult] = useState(null);
  const [aiTestError, setAITestError] = useState('');
  const [aiModelOptions, setAIModelOptions] = useState([]);
  const [aiModelsFetched, setAIModelsFetched] = useState(false);
  const [aiForm, setAIForm] = useState({
    enabled: false,
    baseUrl: '',
    model: '',
    apiKey: '',
    maskedKey: '',
    hasKey: false,
    configured: false,
    providerType: 'openai_compatible',
    temperature: 0.2,
    maxTokens: 1200
  });

  const setAIField = (field, value) => {
    setAIForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'baseUrl' || field === 'apiKey') {
      setAIModelsFetched(false);
    }
  };

  const fetchAISettings = useCallback(async () => {
    setAISettingsLoading(true);
    try {
      const response = await getAISettings();
      const data = response.data || {};
      setAIForm((prev) => ({
        ...prev,
        enabled: Boolean(data.enabled),
        baseUrl: data.baseUrl || '',
        model: data.model || '',
        apiKey: '',
        maskedKey: data.maskedKey || '',
        hasKey: Boolean(data.hasKey),
        configured: Boolean(data.configured),
        providerType: data.providerType || 'openai_compatible',
        temperature: data.temperature ?? 0.2,
        maxTokens: data.maxTokens ?? 1200
      }));
      setAIModelOptions((prev) => dedupeModelOptions(prev, data.model || ''));
      setAIHeadersText(data.extraHeaders && Object.keys(data.extraHeaders).length > 0 ? JSON.stringify(data.extraHeaders, null, 2) : '{}');
      setAITestResult(null);
      setAITestError('');
    } catch (error) {
      console.error('获取 AI 设置失败:', error);
      showMessage('获取 AI 设置失败: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setAISettingsLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    fetchAISettings();
  }, [fetchAISettings]);

  const parseAIExtraHeaders = () => {
    const trimmed = aiHeadersText.trim();
    if (!trimmed) {
      return {};
    }

    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error('额外请求头必须为 JSON 对象，例如 {"HTTP-Referer":"https://example.com"}');
    }

    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
      throw new Error('额外请求头必须为 JSON 对象');
    }

    return Object.entries(parsed).reduce((acc, [key, value]) => {
      const headerKey = key.trim();
      if (headerKey) {
        acc[headerKey] = value == null ? '' : String(value);
      }
      return acc;
    }, {});
  };

  const buildAISettingsPayload = () => ({
    enabled: aiForm.enabled,
    baseUrl: aiForm.baseUrl.trim(),
    model: aiForm.model.trim(),
    apiKey: aiForm.apiKey.trim(),
    temperature: aiForm.temperature === '' ? 0.2 : Number(aiForm.temperature),
    maxTokens: aiForm.maxTokens === '' ? 0 : Number(aiForm.maxTokens),
    extraHeaders: parseAIExtraHeaders()
  });

  const handleFetchAIModels = async () => {
    if (!aiForm.baseUrl.trim() && !aiForm.configured) {
      showMessage('请先填写 AI Base URL', 'warning');
      return;
    }
    if (!aiForm.apiKey.trim() && !aiForm.hasKey) {
      showMessage('请先填写 API Key', 'warning');
      return;
    }

    let payload;
    try {
      payload = buildAISettingsPayload();
    } catch (error) {
      showMessage(error.message, 'warning');
      return;
    }

    setAIAction('models');
    setLoading(true);
    try {
      const response = await listAIModels(payload);
      const models = response.data?.models || [];
      setAIModelOptions(dedupeModelOptions(models, aiForm.model));
      setAIModelsFetched(true);
      showMessage(models.length > 0 ? '模型列表获取成功' : '未发现可用模型，请手动填写模型名称', models.length > 0 ? 'success' : 'info');
    } catch (error) {
      showMessage('获取模型列表失败: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setLoading(false);
      setAIAction('');
    }
  };

  const validateAISettingsPayload = (payload) => {
    if (payload.enabled && !payload.baseUrl) {
      throw new Error('启用 AI 助手时必须填写 AI Base URL');
    }
    if (payload.enabled && !payload.model) {
      throw new Error('启用 AI 助手时必须填写模型名称');
    }
    if (payload.enabled && !payload.apiKey && !aiForm.hasKey) {
      throw new Error('启用 AI 助手时必须提供 API Key');
    }
  };

  const handleTestAISettings = async () => {
    let payload;
    try {
      payload = buildAISettingsPayload();
      validateAISettingsPayload({ ...payload, enabled: true });
    } catch (error) {
      showMessage(error.message, 'warning');
      return;
    }

    setAIAction('test');
    setAITestResult(null);
    setAITestError('');
    setLoading(true);
    try {
      const response = await testAISettings(payload);
      setAITestResult(response.data || null);
      showMessage('AI 连接测试成功');
    } catch (error) {
      setAITestResult(null);
      const message = error.response?.data?.message || error.message;
      setAITestError(message);
      showMessage('连接测试失败: ' + message, 'error');
    } finally {
      setLoading(false);
      setAIAction('');
    }
  };

  const actionButtonSx = {
    minHeight: 44,
    px: 2.5,
    alignSelf: { xs: 'stretch', sm: 'center' }
  };

  const modelButtonSx = {
    height: 56,
    whiteSpace: 'nowrap'
  };

  const handleSaveAISettings = async () => {
    let payload;
    try {
      payload = buildAISettingsPayload();
      validateAISettingsPayload(payload);
    } catch (error) {
      showMessage(error.message, 'warning');
      return;
    }

    setAIAction('save');
    setLoading(true);
    try {
      await updateAISettings(payload);
      showMessage('AI 助手设置保存成功');
      await fetchAISettings();
    } catch (error) {
      showMessage('保存 AI 设置失败: ' + (error.response?.data?.message || error.message), 'error');
    } finally {
      setLoading(false);
      setAIAction('');
    }
  };

  const runWithoutPageJump = async (event, action) => {
    event?.preventDefault();

    const position = { left: window.scrollX, top: window.scrollY };
    const restorePosition = () => window.scrollTo({ ...position, behavior: 'auto' });

    requestAnimationFrame(restorePosition);
    try {
      await action();
    } finally {
      requestAnimationFrame(restorePosition);
      window.setTimeout(restorePosition, 0);
      window.setTimeout(restorePosition, 120);
    }
  };

  const aiUsageText = formatAIUsage(aiTestResult?.usage);

  return (
    <Card variant="outlined">
      <CardHeader
        title="AI 助手设置"
        subheader="配置模板编辑器使用的系统级 AI 助手。"
        avatar={<PsychologyIcon color="primary" />}
        action={
          <FormControlLabel
            sx={{ mr: 0 }}
            control={<Switch checked={aiForm.enabled} onChange={(e) => setAIField('enabled', e.target.checked)} />}
            label={aiForm.enabled ? '启用' : '禁用'}
          />
        }
      />
      <CardContent>
        {aiSettingsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            <Alert severity="info">模板编辑器中的 AI 助手会使用这里的系统级配置。当前仅支持提供“/responses endpoint”的 AI 服务。</Alert>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2">启用系统 AI 助手</Typography>
                  <Typography variant="body2" color="text.secondary">
                    当前接口类型：Responses API（仅支持 `/responses` endpoint）。
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip
                    size="small"
                    color={aiForm.configured ? 'info' : 'default'}
                    variant={aiForm.configured ? 'filled' : 'outlined'}
                    label={aiForm.configured ? '已保存连接参数' : '尚未完成配置'}
                  />
                  <Chip
                    size="small"
                    color={aiForm.hasKey ? 'success' : 'default'}
                    variant="outlined"
                    label={aiForm.hasKey ? `已保存 API Key：${aiForm.maskedKey || '已隐藏'}` : '未保存 API Key'}
                  />
                </Stack>

                <TextField
                  fullWidth
                  label="AI Base URL"
                  value={aiForm.baseUrl}
                  onChange={(e) => setAIField('baseUrl', e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  helperText="需为可用的 Responses API 根地址，并且服务端必须支持 `/responses` endpoint。"
                />

                <Grid container spacing={2} alignItems="flex-start">
                  <Grid item xs={12} md={8}>
                    <Autocomplete
                      freeSolo
                      options={aiModelOptions}
                      value={aiForm.model}
                      inputValue={aiForm.model}
                      onInputChange={(_event, value) => setAIField('model', value || '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="模型"
                          placeholder="gpt-4.1-mini"
                          helperText={
                            aiModelsFetched
                              ? '可从已获取模型中选择，也可手动输入。'
                              : '可手动输入，或先填写 Base URL / API Key 后获取模型列表。'
                          }
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Stack spacing={0.5}>
                      <Button
                        type="button"
                        fullWidth
                        variant="outlined"
                        disabled={loading || aiSettingsLoading}
                        startIcon={loading && aiAction === 'models' ? <CircularProgress size={18} /> : <CachedIcon />}
                        onClick={(event) => runWithoutPageJump(event, handleFetchAIModels)}
                        sx={modelButtonSx}
                      >
                        获取模型
                      </Button>
                      <Typography variant="caption" color="text.secondary" sx={{ px: 1.75, lineHeight: 1.66 }}>
                        使用当前 Base URL / API Key 拉取可选模型。
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Temperature"
                      value={aiForm.temperature}
                      onChange={(e) => setAIField('temperature', e.target.value)}
                      slotProps={{ htmlInput: { min: 0, max: 2, step: 0.1 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Max Tokens"
                      value={aiForm.maxTokens}
                      onChange={(e) => setAIField('maxTokens', e.target.value)}
                      slotProps={{ htmlInput: { min: 0, step: 100 } }}
                      helperText="填 0 使用服务端默认值。"
                    />
                  </Grid>
                </Grid>

                <TextField
                  fullWidth
                  type="password"
                  label={aiForm.hasKey ? '替换 API Key（留空则保留已保存密钥）' : 'API Key'}
                  value={aiForm.apiKey}
                  onChange={(e) => setAIField('apiKey', e.target.value)}
                  autoComplete="off"
                />

                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="额外请求头（JSON）"
                  value={aiHeadersText}
                  onChange={(e) => setAIHeadersText(e.target.value)}
                  helperText='例如：{"HTTP-Referer":"https://example.com"}'
                />
              </Stack>
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2, bgcolor: 'background.default' }}>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ScienceIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2">连接测试结果</Typography>
                </Stack>

                {loading && aiAction === 'test' ? (
                  <Alert severity="info" icon={<CircularProgress size={18} />}>
                    正在连接 AI 服务并发送测试请求...
                  </Alert>
                ) : aiTestError ? (
                  <Alert severity="error">{aiTestError}</Alert>
                ) : aiTestResult ? (
                  <Stack spacing={1.75}>
                    <Alert severity="success">连接测试成功，AI 服务已返回响应。</Alert>
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', p: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                        AI 返回内容
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {aiTestResult.message || '-'}
                      </Typography>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">模型</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                          {aiTestResult.model || aiForm.model || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">延迟</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {typeof aiTestResult.latencyMs === 'number' ? `${aiTestResult.latencyMs} ms` : '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">完成原因</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {aiTestResult.finishReason || '-'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Base URL</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                          {aiTestResult.baseUrl || aiForm.baseUrl || '-'}
                        </Typography>
                      </Grid>
                    </Grid>
                    {aiUsageText && (
                      <Box>
                        <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
                          用量信息
                        </Typography>
                        <Box
                          component="pre"
                          sx={{
                            m: 0,
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 1,
                            bgcolor: 'background.paper',
                            color: 'text.primary',
                            fontFamily: 'monospace',
                            fontSize: '0.8125rem',
                            overflowX: 'auto',
                            p: 1.5,
                            whiteSpace: 'pre-wrap'
                          }}
                        >
                          {aiUsageText}
                        </Box>
                      </Box>
                    )}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    点击“测试连接”后，结果会显示在这里，不会打断当前表单操作。
                  </Typography>
                )}
              </Stack>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Button
                type="button"
                variant="outlined"
                startIcon={loading && aiAction === 'test' ? <CircularProgress size={18} /> : <ScienceIcon />}
                onClick={(event) => runWithoutPageJump(event, handleTestAISettings)}
                disabled={loading}
                sx={actionButtonSx}
              >
                测试连接
              </Button>
              <Button
                type="button"
                variant="contained"
                startIcon={loading && aiAction === 'save' ? <CircularProgress size={18} /> : <SaveIcon />}
                onClick={(event) => runWithoutPageJump(event, handleSaveAISettings)}
                disabled={loading || aiSettingsLoading}
                sx={actionButtonSx}
              >
                保存 AI 设置
              </Button>
            </Stack>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
