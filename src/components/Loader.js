import React from 'react';
import { CircularProgress, Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  loader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
}));

const Loader = () => {
  const classes = useStyles();

  return (
    <Box className={classes.loader}>
      <CircularProgress />
    </Box>
  );
};

export default Loader;