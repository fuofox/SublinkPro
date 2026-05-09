import PropTypes from 'prop-types';
// material-ui
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import useResolvedColorScheme from 'hooks/useResolvedColorScheme';

// ==============================|| AUTHENTICATION CARD WRAPPER ||============================== //

export default function AuthCardWrapper({ children, sx, ...other }) {
  const { isDark } = useResolvedColorScheme();

  return (
    <MainCard
      sx={(theme) => {
        return {
          maxWidth: { xs: 400, lg: 475 },
          margin: { xs: 2.5, md: 3 },
          border: '1px solid',
          borderColor: isDark ? alpha(theme.palette.common.white, 0.08) : alpha(theme.palette.primary.main, 0.1),
          borderRadius: 3,
          bgcolor: 'background.paper',
          backgroundImage: 'none',
          boxShadow: isDark
            ? `0 28px 70px ${alpha(theme.palette.common.black, 0.28)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.035)}`
            : `0 24px 70px ${alpha(theme.palette.primary.dark, 0.1)}, 0 8px 24px ${alpha(theme.palette.grey[500], 0.1)}`,
          '& > *': {
            flexGrow: 1,
            flexBasis: '50%'
          },
          ...(typeof sx === 'function' ? sx(theme) : sx || {})
        };
      }}
      content={false}
      {...other}
    >
      <Box sx={{ p: { xs: 2, sm: 3, xl: 5 } }}>{children}</Box>
    </MainCard>
  );
}

AuthCardWrapper.propTypes = { children: PropTypes.any, other: PropTypes.any, sx: PropTypes.oneOfType([PropTypes.object, PropTypes.func]) };
