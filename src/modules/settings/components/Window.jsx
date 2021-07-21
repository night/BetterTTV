import React, {useEffect, useState} from 'react';
import Modal from 'rsuite/lib/Modal/index.js';
import Sidenav from './Sidenav.jsx';
import About from '../pages/About.jsx';
import ChatSettings from '../pages/ChatSettings.jsx';
import DirectorySettings from '../pages/DirectorySettings.jsx';
import ChannelSettings from '../pages/ChannelSettings.jsx';
import Changelog from '../pages/Changelog.jsx';
import ChatWindow from './ChatWindow.jsx';
import {PageTypes} from '../../../constants.js';

function Page(props) {
  const {page, ...restProps} = props;

  switch (page) {
    case PageTypes.CHAT_SETTINGS:
      return <ChatSettings {...restProps} />;
    case PageTypes.DIRECTORY_SETTINGS:
      return <DirectorySettings {...restProps} />;
    case PageTypes.CHANNEL_SETTINGS:
      return <ChannelSettings {...restProps} />;
    case PageTypes.CHANGELOG:
      return <Changelog {...restProps} />;
    case PageTypes.ABOUT:
    default:
      return <About {...restProps} />;
  }
}

const validateModal = () => window.innerWidth < 600 && window.location.pathname.endsWith('/chat');

function Window({setHandleOpen}) {
  const [page, setPage] = useState(PageTypes.CHAT_SETTINGS);
  const [open, setOpen] = useState(false);
  const [fill, setFill] = useState(validateModal());

  useEffect(() => {
    setHandleOpen(setOpen);

    function validate() {
      setFill(validateModal());
    }

    window.addEventListener('resize', validate);

    return () => {
      window.removeEventListener('resize', validate);
    };
  }, []);

  if (fill) {
    return <ChatWindow show={open} onHide={() => setOpen(false)} />;
  }

  return (
    <Modal show={open} onHide={() => setOpen(false)}>
      <Sidenav value={page} onChange={(value) => setPage(value)} />
      <Page page={page} onHide={() => setOpen(false)} />
    </Modal>
  );
}

export default Window;
