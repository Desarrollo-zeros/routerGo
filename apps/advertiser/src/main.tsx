import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdvertiserApp } from './AdvertiserApp';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('advertiser_root_missing');
createRoot(root).render(<StrictMode><AdvertiserApp /></StrictMode>);
