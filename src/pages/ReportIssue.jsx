import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Check, CheckCircle, Droplets, FileText, Landmark, Lightbulb, Loader2, MapPin, MoreHorizontal, RefreshCw, Route, Search, Sparkles, Trash2, Upload, Waves, X } from 'lucide-react';
import * as tmImage from '@teachablemachine/image';

// Drop-in React page. Styles and animations live in this file; no new packages.
// Keeps the original localStorage keys, report schema, model, and /map route.
// Location now captures a detailed street address (OpenStreetMap Nominatim, no API key) instead of raw coordinates.
const MODEL_URL = 'https://teachablemachine.withgoogle.com/models/fUMMhKUu_/';
const GEOCODER_URL = 'https://nominatim.openstreetmap.org';
const CATEGORIES = [
  { name: 'Road', icon: Route, hint: 'Potholes & damage' },
  { name: 'Garbage', icon: Trash2, hint: 'Waste & dumping' },
  { name: 'Water', icon: Droplets, hint: 'Leaks & supply' },
  { name: 'Waterlogging', icon: Waves, hint: 'Flooding & drainage' },
  { name: 'Streetlight', icon: Lightbulb, hint: 'Lighting issues' },
  { name: 'Other', icon: MoreHorizontal, hint: 'Something else' },
];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const normalizeCategory = (value) => CATEGORIES.find(c => c.name.toLowerCase() === value.trim().toLowerCase())?.name;

// Turn a Nominatim result into a readable address plus labelled parts.
function describeAddress(result) {
  const a = result?.address || {};
  const street = [a.house_number, a.road].filter(Boolean).join(' ') || a.pedestrian || a.footway || '';
  const area = a.neighbourhood || a.suburb || a.quarter || a.residential || '';
  const city = a.city || a.town || a.village || a.municipality || a.county || '';
  const parts = [
    street && { label: 'Street', value: street },
    area && { label: 'Area', value: area },
    city && { label: 'City', value: city },
    a.state && { label: 'State', value: a.state },
    a.postcode && { label: 'Postcode', value: a.postcode },
  ].filter(Boolean);
  return { display: result?.display_name || '', parts };
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(`${GEOCODER_URL}/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Reverse lookup failed');
  const data = await res.json();
  if (!data || data.error) throw new Error('No address found');
  return describeAddress(data);
}

async function searchAddress(query) {
  const res = await fetch(`${GEOCODER_URL}/search?format=jsonv2&addressdetails=1&limit=4&q=${encodeURIComponent(query)}`, { headers: { 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return (Array.isArray(data) ? data : [])
    .map(item => ({ lat: Number(item.lat), lng: Number(item.lon), ...describeAddress(item) }))
    .filter(item => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

const shortAddress = (display) => display.split(',').slice(0, 3).join(',').trim();

export default function ReportIssue() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [landmark, setLandmark] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [modelStatus, setModelStatus] = useState('loading');
  const [aiPrediction, setAiPrediction] = useState(null);
  const [classifying, setClassifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const inputRef = useRef(null);
  const modelRef = useRef(null);
  const mounted = useRef(false);
  const imageVersion = useRef(0);
  const categoryTouched = useRef(false);
  const locationVersion = useRef(0);
  const submitting = useRef(false);
  const progress = [Boolean(title.trim() && description.trim()), Boolean(category), Boolean(location)];
  const completed = progress.filter(Boolean).length;

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    tmImage.load(`${MODEL_URL}model.json`, `${MODEL_URL}metadata.json`)
      .then(model => { if (!cancelled) { modelRef.current = model; setModelStatus('ready'); } })
      .catch(() => { if (!cancelled) setModelStatus('unavailable'); });
    return () => { cancelled = true; mounted.current = false; imageVersion.current++; locationVersion.current++; };
  }, []);

  // Also classify a photo chosen before the model finished loading.
  useEffect(() => {
    if (!image || modelStatus !== 'ready') return;
    let cancelled = false;
    const version = imageVersion.current;
    const objectUrl = URL.createObjectURL(image);
    setClassifying(true);
    (async () => {
      try {
        const img = new Image();
        await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = objectUrl; });
        const predictions = await modelRef.current.predict(img);
        const best = predictions.reduce((top, item) => !top || item.probability > top.probability ? item : top, null);
        if (!cancelled && version === imageVersion.current && best) {
          setAiPrediction({ category: best.className, confidence: best.probability });
          const supported = normalizeCategory(best.className);
          if (supported && best.probability > 0.6 && !categoryTouched.current) setCategory(supported);
        }
      } catch { if (!cancelled) setPhotoError('AI could not analyze this photo. Please choose a category below.'); }
      finally { URL.revokeObjectURL(objectUrl); if (!cancelled) setClassifying(false); }
    })();
    return () => { cancelled = true; URL.revokeObjectURL(objectUrl); };
  }, [image, modelStatus]);

  // Look up the street address for a detected position.
  async function lookupAddress(next, version) {
    setAddress(null); setAddressLoading(true);
    try {
      const found = await reverseGeocode(next.lat, next.lng);
      if (mounted.current && version === locationVersion.current) setAddress(found);
    } catch {
      if (mounted.current && version === locationVersion.current) setLocationError('We found your position but could not look up the street address. Search for the address below or add a landmark.');
    } finally {
      if (mounted.current && version === locationVersion.current) setAddressLoading(false);
    }
  }

  function locate() {
    if (!navigator.geolocation) { setLocationError('Your browser does not support location. Search for the issue address below.'); return; }
    const version = ++locationVersion.current;
    setLocating(true); setLocationError(''); setSearchResults([]);
    navigator.geolocation.getCurrentPosition(position => {
      if (!mounted.current || version !== locationVersion.current) return;
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      setLocation(next); setLocating(false);
      lookupAddress(next, version);
    }, () => {
      if (!mounted.current || version !== locationVersion.current) return;
      setLocating(false); setLocationError('Location could not be detected. Allow location access and retry, or search for the address below.');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }

  async function runSearch() {
    const query = addressQuery.trim();
    if (query.length < 3) { setLocationError('Type at least 3 characters of the street, area, or landmark.'); return; }
    setSearching(true); setLocationError(''); setSearchResults([]);
    try {
      const results = await searchAddress(query);
      if (!mounted.current) return;
      if (!results.length) setLocationError('No matching place found. Try adding the area or city name.');
      setSearchResults(results);
    } catch {
      if (mounted.current) setLocationError('Address search is unavailable right now. Check your connection and try again.');
    } finally { if (mounted.current) setSearching(false); }
  }

  function pickResult(result) {
    locationVersion.current++;
    setLocating(false); setAddressLoading(false);
    setLocation({ lat: result.lat, lng: result.lng });
    setAddress({ display: result.display, parts: result.parts });
    setSearchResults([]); setLocationError('');
  }

  function chooseImage(file) {
    if (!file) return;
    setPhotoError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setPhotoError('Please choose a JPG, PNG, or WebP photo.'); return; }
    if (file.size > MAX_IMAGE_BYTES) { setPhotoError('Please choose a photo under 2 MB to keep local reports small.'); return; }
    const version = ++imageVersion.current;
    setAiPrediction(null); setClassifying(false); setImage(null); setImagePreview('');
    const reader = new FileReader();
    reader.onload = () => {
      if (mounted.current && version === imageVersion.current && typeof reader.result === 'string') {
        setImagePreview(reader.result); setImage(file);
      }
    };
    reader.onerror = () => { if (mounted.current && version === imageVersion.current) setPhotoError('This photo could not be read. Try another file.'); };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    imageVersion.current++; setImage(null); setImagePreview(''); setAiPrediction(null); setClassifying(false); setPhotoError('');
    if (inputRef.current) inputRef.current.value = '';
  }

  function submit(event) {
    event.preventDefault();
    if (submitting.current || submittedId) return;
    setError('');
    if (!title.trim() || !description.trim() || !category) { setError('Add a title, description, and category before submitting.'); return; }
    if (!location) { setError('Set the issue location before submitting.'); return; }
    submitting.current = true; setLoading(true);
    try {
      const issues = JSON.parse(localStorage.getItem('issues') || '[]');
      if (!Array.isArray(issues)) throw new Error('Saved reports could not be read. Your existing data has not been overwritten.');
      let user;
      try { user = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch { user = null; }
      if (!user?.id) {
        user = { id: `user_${Date.now()}`, email: 'user@example.com', displayName: 'Anonymous User' };
        localStorage.setItem('currentUser', JSON.stringify(user));
      }
      const issueId = globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
      const report = {
        id: issueId, issueId, title: title.trim(), description: description.trim(), category,
        imageURL: imagePreview || '', aiPrediction, location,
        // New: detailed location fields. `location` ({ lat, lng }) is unchanged so the map keeps working.
        address: address?.display || '', addressParts: address?.parts || [], landmark: landmark.trim(),
        createdAt: new Date().toISOString(), status: 'open', upvotes: [], comments: [], userId: user.id,
      };
      localStorage.setItem('issues', JSON.stringify([...issues, report]));
      // The report is already saved: optional metadata failure must not offer a duplicate submission.
      try {
        let stats;
        try { stats = JSON.parse(localStorage.getItem('userStats') || 'null'); } catch { stats = null; }
        if (!stats || typeof stats !== 'object' || Array.isArray(stats)) stats = { totalReports: 0, resolvedReports: 0, totalUpvotes: 0, points: 0 };
        stats.totalReports = (Number(stats.totalReports) || 0) + 1;
        stats.points = (Number(stats.points) || 0) + 10;
        localStorage.setItem('userStats', JSON.stringify(stats));
        localStorage.setItem('mapCenter', JSON.stringify(location));
      } catch { /* Report remains successfully saved. */ }
      setSubmittedId(issueId);
    } catch (failure) {
      setError(failure?.name === 'QuotaExceededError' ? 'Browser storage is full. Try removing the photo or freeing storage, then submit again.' : failure?.message || 'Could not save your report. Please try again.');
    } finally { submitting.current = false; setLoading(false); }
  }

  const locationSummary = !location
    ? 'Detect your current position or search for an address.'
    : addressLoading
      ? 'Looking up the street address…'
      : address?.display || 'Pin placed. Street address unavailable, so add a landmark below.';

  const previewLocation = !location
    ? 'Location waiting to be added'
    : addressLoading
      ? 'Finding address…'
      : address?.display ? shortAddress(address.display) : 'Pin placed on the map';

  return (
    <main className="cl-report">
      <style>{styles}</style>
      <div className="cl-orb cl-orb-one" aria-hidden="true" /><div className="cl-orb cl-orb-two" aria-hidden="true" />
      <div className="cl-shell">
        <header className="cl-topbar"><button type="button" className="cl-back" onClick={() => navigate('/map')}><ArrowLeft size={17} /> Back to map</button><span className="cl-brand"><span className="cl-brand-icon"><MapPin size={17} /></span> CivicLink<span className="cl-brand-dot">●</span></span></header>
        <div className="cl-heading cl-enter"><span className="cl-eyebrow"><span /> SMALL ACTIONS. BETTER NEIGHBORHOODS.</span><h1>A better city starts<br />with <span>your voice.</span></h1><p>See something that needs attention? Share the details.<br className="cl-desktop-break" /> Make your neighborhood a little better, one report at a time.</p></div>
        {submittedId ? (
          <section className="cl-success cl-enter" aria-live="polite"><div className="cl-success-symbol"><Check size={44} /></div><span className="cl-eyebrow">THANK YOU FOR TAKING ACTION</span><h2>Your voice is on the map.</h2><p>Your report has been saved in this browser. You can now view it on the issue map.</p><div className="cl-receipt"><span>REPORT REFERENCE</span><strong>{submittedId.slice(0, 8).toUpperCase()}</strong><small>{title} · {category}</small></div><button className="cl-primary" onClick={() => navigate('/map')}>View on map <ArrowRight size={18} /></button></section>
        ) : (
          <div className="cl-layout">
            <form className="cl-form cl-enter" onSubmit={submit}>
              <div className="cl-form-heading"><div><span className="cl-eyebrow">LET’S MAKE IT COUNT</span><h2>Report an issue</h2></div><span className={`cl-ai-status ${modelStatus}`} aria-live="polite">{modelStatus === 'loading' ? <Loader2 className="cl-spin" size={14} /> : <Sparkles size={14} />}{modelStatus === 'ready' ? 'AI assist ready' : modelStatus === 'loading' ? 'AI warming up' : 'Manual mode'}</span></div>
              <section className="cl-section"><SectionHeading number="01" title="Show us what’s happening" subtitle="A clear photo helps tell the story. Optional, but useful." />
                <input ref={inputRef} className="cl-visually-hidden" type="file" id="issue-photo" accept="image/jpeg,image/png,image/webp" onChange={e => { chooseImage(e.target.files?.[0]); e.target.value = ''; }} />
                {imagePreview ? <div className="cl-photo"><img src={imagePreview} alt="Selected civic issue" /><button type="button" className="cl-photo-remove" aria-label="Remove photo" onClick={removeImage}><X size={17} /></button><span className="cl-photo-caption"><Camera size={14} /> {image?.name}</span>{classifying && <div className="cl-scanning"><div className="cl-scan-line" /><span><Loader2 size={18} className="cl-spin" /> Finding the best category…</span></div>}</div> : <button type="button" className={`cl-dropzone ${dragging ? 'is-dragging' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); chooseImage(e.dataTransfer.files?.[0]); }}><span className="cl-upload-icon"><Upload size={26} /></span><strong>{dragging ? 'Drop your photo here' : 'Drop a photo, tell a story'}</strong><span>Drag & drop or <b>browse files</b></span><small>JPG, PNG or WebP · Up to 2 MB</small></button>}
                {photoError && <p className="cl-error" role="alert">{photoError}</p>}
                {aiPrediction && <div className="cl-ai-result" aria-live="polite"><Sparkles size={18} /><div><strong>AI suggests: {aiPrediction.category}</strong><p>{Math.round(aiPrediction.confidence * 100)}% model confidence · Please verify the category.</p><div className="cl-confidence"><span style={{ width: `${Math.max(0, Math.min(100, aiPrediction.confidence * 100))}%` }} /></div></div></div>}
              </section>
              <section className="cl-section"><SectionHeading number="02" title="Give it a little context" subtitle="The more specific you are, the easier it is to understand." /><label className="cl-label" htmlFor="issue-title">Issue title <span>*</span></label><input className="cl-input" id="issue-title" placeholder="e.g. Broken streetlight near the bus stop" value={title} maxLength={120} required onChange={e => setTitle(e.target.value)} /><div className="cl-label-row"><label className="cl-label" htmlFor="issue-description">What’s the issue? <span>*</span></label><span>{description.length}/1200</span></div><textarea className="cl-input" id="issue-description" placeholder="Describe what you noticed, a nearby landmark, and how it affects your neighborhood…" rows={4} maxLength={1200} value={description} required onChange={e => setDescription(e.target.value)} /><p className="cl-field-hint">Avoid sharing phone numbers or other personal information.</p></section>
              <section className="cl-section"><SectionHeading number="03" title="Choose the right category" subtitle="Pick the closest match. You can override the AI suggestion." /><div className="cl-category-grid" role="group" aria-label="Issue category (required)">{CATEGORIES.map(({ name, icon: Icon, hint }) => <button key={name} type="button" aria-pressed={category === name} className={`cl-category ${category === name ? 'is-selected' : ''}`} onClick={() => { categoryTouched.current = true; setCategory(name); }}><Icon size={21} /><strong>{name}</strong><small>{hint}</small>{category === name && <span className="cl-category-check"><Check size={11} /></span>}</button>)}</div></section>

              <section className="cl-section">
                <SectionHeading number="04" title="Pinpoint the location" subtitle="Use your current location if you’re at the issue. Otherwise, search for its address." />
                <div className={`cl-location ${location ? 'is-ready' : ''}`}>
                  <span className="cl-location-icon"><MapPin size={22} /></span>
                  <div aria-live="polite">
                    <strong>{location ? 'Issue location selected' : 'Where should we look?'}</strong>
                    <p>{locationSummary}</p>
                  </div>
                  <button type="button" className="cl-locate" disabled={locating} onClick={locate}>{locating ? <Loader2 size={16} className="cl-spin" /> : <RefreshCw size={15} />}{locating ? 'Locating' : location ? 'Refresh' : 'Locate me'}</button>
                </div>

                {address?.parts?.length > 0 && (
                  <dl className="cl-address">
                    {address.parts.map(part => <div className="cl-address-part" key={part.label}><dt>{part.label}</dt><dd>{part.value}</dd></div>)}
                  </dl>
                )}

                {location && (
                  <>
                    <label className="cl-label cl-landmark-label" htmlFor="issue-landmark"><Landmark size={14} /> Landmark or extra details <em>(optional)</em></label>
                    <input className="cl-input" id="issue-landmark" placeholder="e.g. Opposite the metro pillar 1245, near the tea stall" value={landmark} maxLength={160} onChange={e => setLandmark(e.target.value)} />
                  </>
                )}

                <details className="cl-manual">
                  <summary>Not at the issue? Search for an address</summary>
                  <div className="cl-search-row">
                    <label htmlFor="issue-address-search">Street, area, or landmark
                      <input className="cl-input" id="issue-address-search" value={addressQuery} placeholder="e.g. Banjara Hills Road No. 12, Hyderabad" onChange={e => setAddressQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }} />
                    </label>
                    <button type="button" className="cl-secondary" disabled={searching} onClick={runSearch}>{searching ? <Loader2 size={14} className="cl-spin" /> : <Search size={14} />} Search</button>
                  </div>
                  {searchResults.length > 0 && (
                    <ul className="cl-results" aria-label="Matching places">
                      {searchResults.map((result, i) => <li key={`${result.lat}-${result.lng}-${i}`}><button type="button" onClick={() => pickResult(result)}><MapPin size={15} /><span>{result.display}</span></button></li>)}
                    </ul>
                  )}
                </details>
                {locationError && <p className="cl-error" role="alert">{locationError}</p>}
              </section>

              <footer className="cl-form-footer">{error && <p className="cl-error" role="alert">{error}</p>}<button className="cl-primary" type="submit" disabled={loading || classifying}>{loading || classifying ? <Loader2 size={18} className="cl-spin" /> : <><span>Submit report</span><ArrowRight size={18} /></>}{loading ? 'Saving your report…' : classifying ? 'Analyzing photo…' : ''}</button><p>Your report will be saved in this browser and shown on the map.</p></footer>
            </form>
            <aside className="cl-sidebar cl-enter"><div className="cl-preview"><span className="cl-eyebrow">YOUR REPORT, AT A GLANCE</span><div className="cl-preview-heading"><h2>Overview.</h2><span><FileText size={18} /></span></div><p className="cl-preview-intro">A little detail goes a long way.</p><div className="cl-preview-photo">{imagePreview ? <img src={imagePreview} alt="Report summary photo" /> : <><div className="cl-city" aria-hidden="true">{[38, 64, 47, 85, 58, 72, 43].map((height, i) => <span key={i} style={{ height: `${height}%` }} />)}<span className="cl-city-pin"><MapPin size={25} /></span></div><span>Your neighborhood. Your impact.</span></>}</div><div className="cl-preview-body"><span className="cl-preview-tag">{category || 'CATEGORY NOT SELECTED'}</span><h3>{title.trim() || 'Your next small act of change'}</h3><p className="cl-preview-description">{description.trim() || 'Your issue description will appear here as you fill in the details.'}</p><div className="cl-preview-location"><MapPin size={14} /><span>{previewLocation}</span></div></div><div className="cl-readiness"><div><strong>Ready to report</strong><span>{completed}/3 essentials</span></div><div className="cl-progress" role="progressbar" aria-label="Report completeness" aria-valuemin={0} aria-valuemax={3} aria-valuenow={completed}><span style={{ width: `${completed / 3 * 100}%` }} /></div>{['Issue details', 'Category selected', 'Location added'].map((label, i) => <div className={`cl-checklist ${progress[i] ? 'is-done' : ''}`} key={label}>{progress[i] ? <CheckCircle size={16} /> : <span className="cl-empty-check" />}<span>{label}</span></div>)}</div></div><div className="cl-tip"><span className="cl-tip-icon"><Lightbulb size={21} /></span><div><strong>A great report starts with clarity.</strong><p>Include a nearby landmark, describe the problem, and add a photo if you can.</p></div></div><p className="cl-sidebar-note">Built for people who care<br />about the places they call home.</p></aside>
          </div>
        )}
        <div className="cl-bottom">CivicLink <span>·</span> Small actions, shared progress.</div>
      </div>
    </main>
  );
}

function SectionHeading({ number, title, subtitle }) {
  return <div className="cl-section-heading"><span>{number}</span><div><h3>{title}</h3><p>{subtitle}</p></div></div>;
}

const styles = `
.cl-report{--ink:#183b36;--muted:#667b75;--teal:#087f70;--line:#e3ebe6;min-height:100vh;background:#f7f8f2;color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;position:relative;isolation:isolate;overflow:hidden}.cl-report *{box-sizing:border-box}.cl-report button,.cl-report input,.cl-report textarea{font:inherit}.cl-report button{cursor:pointer}.cl-report button:disabled{cursor:wait;opacity:.65}.cl-report button:focus-visible,.cl-report summary:focus-visible{outline:3px solid #20a791;outline-offset:4px}.cl-report svg{flex-shrink:0}.cl-shell{max-width:1160px;margin:auto;padding:28px 32px 20px;position:relative}.cl-orb{position:absolute;border-radius:50%;filter:blur(65px);pointer-events:none;z-index:-1;animation:cl-drift 15s ease-in-out infinite alternate}.cl-orb-one{width:500px;height:500px;top:-200px;right:-80px;background:#d9eee1;opacity:.7}.cl-orb-two{width:300px;height:300px;top:650px;left:-180px;background:#f2e6be;opacity:.4}.cl-topbar{display:flex;justify-content:space-between;align-items:center}.cl-back{border:0;background:transparent;color:var(--muted);display:flex;align-items:center;gap:8px;font-size:13px!important;padding:8px 0;transition:color .2s}.cl-back:hover{color:var(--teal)}.cl-brand{display:flex;align-items:center;gap:8px;font-weight:750;font-size:17px;letter-spacing:-.6px}.cl-brand-icon{display:grid;place-items:center;width:29px;height:29px;border-radius:9px;background:var(--teal);color:white}.cl-brand-dot{font-size:9px;color:var(--teal);align-self:flex-start;margin-top:4px}.cl-heading{padding:50px 0 36px}.cl-eyebrow{font-size:10px;letter-spacing:1.8px;font-weight:750;color:var(--teal);display:inline-flex;align-items:center;gap:8px}.cl-eyebrow>span{width:6px;height:6px;border-radius:50%;background:var(--teal);box-shadow:0 0 0 4px #087f7010}.cl-heading h1{font-size:clamp(35px,5vw,58px);line-height:1.12;font-weight:750;letter-spacing:-2.7px;margin:17px 0}.cl-heading h1>span{color:var(--teal)}.cl-heading>p{font-size:14px;line-height:1.8;color:var(--muted);margin:0}.cl-layout{display:grid;grid-template-columns:minmax(0,1fr) 318px;gap:28px;align-items:start}.cl-form{border:1px solid var(--line);background:#fff;border-radius:23px;box-shadow:0 10px 45px #193e3610;overflow:hidden}.cl-form-heading{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:28px 30px;border-bottom:1px solid var(--line)}.cl-form-heading h2{font-size:23px;letter-spacing:-.7px;margin:7px 0 0}.cl-ai-status{display:flex;align-items:center;gap:6px;border:1px solid #daeee6;background:#f1faf6;color:var(--teal);padding:7px 9px;border-radius:30px;font-size:10px;white-space:nowrap}.cl-ai-status.unavailable{color:#92692c;border-color:#f0e2c8;background:#fff9ed}.cl-section{padding:26px 30px;border-bottom:1px solid var(--line)}.cl-section-heading{display:flex;gap:13px;margin-bottom:20px;align-items:flex-start}.cl-section-heading>span{display:grid;place-items:center;min-width:30px;height:30px;border-radius:9px;border:1px solid #deebe5;background:#f5f9f6;color:var(--teal);font-size:11px;font-weight:700}.cl-section-heading h3{font-size:15px;line-height:1.4;margin:0 0 5px;letter-spacing:-.2px}.cl-section-heading p{font-size:11px;color:var(--muted);line-height:1.7;margin:0}.cl-dropzone{width:100%;min-height:202px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;background:#f7fbf8;border:1.5px dashed #b9d6c9;border-radius:14px;color:var(--ink);transition:background .25s,border .25s,transform .25s}.cl-dropzone:hover,.cl-dropzone.is-dragging{background:#ecf8f1;border-color:var(--teal);transform:translateY(-2px)}.cl-upload-icon{display:grid;place-items:center;width:55px;height:55px;background:white;box-shadow:0 5px 18px #183b3610;border-radius:17px;color:var(--teal);margin-bottom:5px;transition:transform .3s}.cl-dropzone:hover .cl-upload-icon{transform:translateY(-4px) rotate(-5deg)}.cl-dropzone strong{font-size:14px}.cl-dropzone>span:not(.cl-upload-icon){font-size:12px;color:var(--muted)}.cl-dropzone b{color:var(--teal)}.cl-dropzone small{font-size:10px;color:#8a9d94}.cl-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.cl-photo{height:240px;border-radius:14px;overflow:hidden;position:relative;background:#edf4ef}.cl-photo>img,.cl-preview-photo img{width:100%;height:100%;object-fit:cover}.cl-photo-remove{position:absolute;right:12px;top:12px;border:0;background:white;color:var(--ink);width:32px;height:32px;display:grid;place-items:center;border-radius:50%;z-index:2}.cl-photo-caption{position:absolute;bottom:0;left:0;right:0;padding:25px 14px 13px;display:flex;gap:8px;align-items:center;color:white;font-size:11px;background:linear-gradient(transparent,#17382dc9);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cl-scanning{position:absolute;inset:0;background:#0b302b77;display:grid;place-items:center;color:white}.cl-scanning>span{display:flex;align-items:center;gap:8px;background:#123e35cc;padding:12px;border-radius:10px;font-size:12px;z-index:1}.cl-scan-line{position:absolute;top:0;height:2px;left:0;right:0;background:#8af5b9;box-shadow:0 0 25px 8px #8af5b933;animation:cl-scan 2s ease-in-out infinite}.cl-ai-result{display:flex;align-items:flex-start;gap:10px;background:#f0faf5;border:1px solid #d4ebdf;border-radius:12px;padding:14px;margin-top:12px;color:var(--teal);animation:cl-enter .4s ease both}.cl-ai-result>div{flex:1}.cl-ai-result strong{font-size:12px}.cl-ai-result p{font-size:10px;line-height:1.7;margin:4px 0 8px;color:var(--muted)}.cl-confidence,.cl-progress{height:5px;background:#deebe3;border-radius:10px;overflow:hidden}.cl-confidence span,.cl-progress span{display:block;height:100%;border-radius:10px;background:var(--teal);transition:width .6s ease}.cl-label{display:block;font-size:12px;font-weight:650;margin-bottom:8px}.cl-label>span{color:var(--teal)}.cl-input{display:block;width:100%;border:1px solid #dce6df;border-radius:10px;padding:12px 13px;background:#fcfdfb;color:var(--ink);font-size:12px!important;outline:none;transition:box-shadow .2s,border-color .2s}.cl-input:focus{border-color:#38a78c;box-shadow:0 0 0 3px #087f7012;background:white}.cl-input::placeholder{color:#94a39b}.cl-report textarea{resize:vertical;min-height:115px;line-height:1.8}.cl-label-row{display:flex;justify-content:space-between;align-items:center;margin-top:20px}.cl-label-row>span{font-size:10px;color:#8a9c94;margin-bottom:8px}.cl-field-hint{font-size:10px;color:#7f9189;line-height:1.6;margin:8px 0 0}.cl-category-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.cl-category{position:relative;min-height:95px;background:white;border:1px solid #e1e9e3;border-radius:12px;display:flex;flex-direction:column;align-items:flex-start;gap:7px;padding:13px;color:#627b70;transition:transform .2s,background .2s,border-color .2s,box-shadow .2s}.cl-category:hover{transform:translateY(-3px);border-color:#8fc5b1;box-shadow:0 5px 12px #1b4d3210}.cl-category.is-selected{background:#edf8f2;border-color:var(--teal);color:var(--teal);box-shadow:0 0 0 1px var(--teal)}.cl-category strong{font-size:11px;color:var(--ink)}.cl-category small{font-size:9px;color:var(--muted)}.cl-category-check{position:absolute;right:9px;top:9px;display:grid;place-items:center;width:16px;height:16px;border-radius:50%;background:var(--teal);color:white;animation:cl-pop .25s ease both}.cl-location{display:flex;align-items:center;gap:12px;background:#f8faf6;border:1px solid #e1e9df;border-radius:12px;padding:15px;transition:background .25s,border-color .25s}.cl-location.is-ready{background:#f0faf5;border-color:#cfe8da}.cl-location-icon{width:40px;height:40px;display:grid;place-items:center;background:#eaf3e9;border-radius:12px;color:var(--teal)}.cl-location>div{flex:1;min-width:0}.cl-location strong{font-size:11px}.cl-location p{font-size:10px;line-height:1.6;color:var(--muted);margin:4px 0 0;overflow-wrap:anywhere}.cl-locate{border:0;background:white;border-radius:8px;padding:9px 10px;display:flex;gap:5px;align-items:center;color:var(--teal);font-size:10px!important;box-shadow:0 2px 8px #183b3608}.cl-address{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:12px 0 0;animation:cl-enter .4s ease both}.cl-address-part{background:#fcfdfb;border:1px solid var(--line);border-radius:10px;padding:9px 11px;min-width:0}.cl-address-part dt{font-size:9px;color:var(--muted);margin:0 0 3px}.cl-address-part dd{font-size:11px;font-weight:650;margin:0;overflow-wrap:anywhere}.cl-landmark-label{display:flex;align-items:center;gap:6px;margin:18px 0 8px}.cl-landmark-label svg{color:var(--teal)}.cl-landmark-label em{font-style:normal;font-weight:400;color:var(--muted);font-size:11px}.cl-manual{font-size:11px;color:var(--muted);margin-top:13px}.cl-manual summary{cursor:pointer;padding:4px 0}.cl-search-row{display:flex;gap:9px;align-items:flex-end;margin-top:12px}.cl-search-row>label{flex:1;min-width:0;font-size:10px}.cl-search-row input{margin-top:5px}.cl-secondary{display:flex;align-items:center;gap:6px;border:1px solid #d4e4da;border-radius:10px;background:#eef7f1;padding:12px;color:var(--teal);font-size:11px!important;white-space:nowrap}.cl-results{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:6px;animation:cl-enter .3s ease both}.cl-results button{width:100%;display:flex;align-items:flex-start;gap:9px;text-align:left;background:white;border:1px solid #e1e9e3;border-radius:10px;padding:10px 12px;color:var(--ink);font-size:11px!important;line-height:1.6;transition:border-color .2s,background .2s}.cl-results button:hover{border-color:var(--teal);background:#f0faf5}.cl-results svg{color:var(--teal);margin-top:2px}.cl-results span{overflow-wrap:anywhere}.cl-error{font-size:12px;color:#a93b38;background:#fff4f0;border:1px solid #f3dcd5;padding:11px 13px;border-radius:9px;line-height:1.7}.cl-form-footer{padding:25px 30px}.cl-primary{display:flex;justify-content:center;align-items:center;gap:12px;min-height:49px;width:100%;background:var(--teal);color:white;border:0;border-radius:11px;font-weight:650;font-size:13px!important;box-shadow:0 5px 12px #087f7020;transition:background .2s,transform .2s,box-shadow .2s}.cl-primary:hover:not(:disabled){background:#06695d;transform:translateY(-2px);box-shadow:0 8px 18px #087f7030}.cl-primary svg{transition:transform .2s}.cl-primary:hover svg{transform:translateX(3px)}.cl-form-footer>p:last-child{text-align:center;color:#87968e;font-size:10px;line-height:1.7;margin:12px 0 0}.cl-sidebar{position:sticky;top:24px;animation-delay:.12s!important}.cl-preview{border:1px solid #dfe9de;border-radius:20px;padding:23px;background:#fcfdf9;box-shadow:0 7px 30px #183b3606}.cl-preview>.cl-eyebrow{font-size:9px;letter-spacing:1.3px}.cl-preview-heading{display:flex;align-items:center;justify-content:space-between;margin-top:10px}.cl-preview-heading h2{font-size:23px;letter-spacing:-.8px;margin:0}.cl-preview-heading>span{color:#82a99a}.cl-preview-intro{font-size:11px;color:var(--muted);margin:8px 0 20px}.cl-preview-photo{height:154px;border-radius:12px;overflow:hidden;background:#eaf2e7;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}.cl-preview-photo>span{position:absolute;bottom:13px;font-size:9px;color:#689180}.cl-city{display:flex;align-items:flex-end;gap:7px;height:100px;width:190px;margin-bottom:30px;position:relative}.cl-city>span:not(.cl-city-pin){flex:1;background:linear-gradient(#bcd7c2,#d6e8d3);border-radius:4px 4px 0 0;position:relative}.cl-city>span:not(.cl-city-pin):after{content:'';position:absolute;left:6px;top:12px;right:6px;height:35%;background:repeating-linear-gradient(to bottom,#eaf2e7aa 0 4px,transparent 4px 12px)}.cl-city-pin{position:absolute;left:81px;top:-3px;display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#fff;color:var(--teal);box-shadow:0 5px 20px #087f701f;animation:cl-float 4s ease-in-out infinite}.cl-preview-body{padding:20px 0;border-bottom:1px solid var(--line)}.cl-preview-tag{font-size:8px;letter-spacing:.8px;font-weight:700;color:var(--teal);background:#eaf4ec;padding:5px 8px;border-radius:5px;display:inline-block}.cl-preview-body h3{font-size:16px;line-height:1.5;margin:12px 0 7px;letter-spacing:-.3px;overflow-wrap:anywhere}.cl-preview-description{font-size:11px;line-height:1.8;color:var(--muted);margin:0;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}.cl-preview-location{display:flex;align-items:flex-start;gap:5px;font-size:9px;line-height:1.6;color:#7c9288;margin-top:16px}.cl-preview-location svg{margin-top:2px}.cl-preview-location span{overflow-wrap:anywhere}.cl-readiness{padding-top:20px}.cl-readiness>div:first-child{display:flex;justify-content:space-between;font-size:10px;margin-bottom:11px}.cl-readiness>div:first-child>span{color:var(--muted)}.cl-progress{margin-bottom:15px}.cl-checklist{display:flex;align-items:center;gap:8px;font-size:10px;color:#91a198;margin-top:11px}.cl-checklist.is-done{color:var(--teal)}.cl-empty-check{width:16px;height:16px;border:1px solid #d6e2d9;border-radius:50%}.cl-tip{display:flex;align-items:flex-start;gap:12px;margin-top:18px;background:#f1efe0;border:1px solid #e8e5cf;border-radius:14px;padding:17px}.cl-tip-icon{color:#8c8c54}.cl-tip strong{font-size:11px;line-height:1.6;color:#626c43}.cl-tip p{font-size:10px;line-height:1.8;color:#868c6b;margin:6px 0 0}.cl-sidebar-note{text-align:center;font-size:10px;line-height:1.9;color:#96a094;margin-top:23px}.cl-bottom{text-align:center;color:#8e9c91;font-size:10px;padding:35px 0 4px}.cl-bottom>span{padding:0 9px}.cl-enter{animation:cl-enter .65s cubic-bezier(.2,.7,.2,1) both}.cl-spin{animation:cl-spin 1s linear infinite}.cl-success{max-width:680px;margin:0 auto;background:white;border:1px solid var(--line);border-radius:24px;padding:48px;text-align:center;box-shadow:0 10px 45px #193e3610}.cl-success-symbol{width:90px;height:90px;margin:0 auto 25px;border-radius:50%;background:#e7f7ec;display:grid;place-items:center;color:var(--teal);animation:cl-pop .6s ease both;box-shadow:0 0 0 12px #f4faf4}.cl-success h2{font-size:30px;letter-spacing:-1px}.cl-success>p{font-size:13px;line-height:1.9;color:var(--muted)}.cl-receipt{display:flex;flex-direction:column;gap:9px;padding:20px;background:#f5f9f3;border:1px dashed #c4d9c8;border-radius:12px;margin:25px 0}.cl-receipt>span{font-size:9px;letter-spacing:1.5px;color:var(--muted)}.cl-receipt strong{font-size:22px;letter-spacing:3px}.cl-receipt small{color:var(--muted);overflow-wrap:anywhere}
@keyframes cl-enter{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes cl-spin{to{transform:rotate(360deg)}}@keyframes cl-pop{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}@keyframes cl-drift{to{transform:translate(30px,35px)}}@keyframes cl-float{50%{transform:translateY(-7px)}}@keyframes cl-scan{50%{top:98%}}
@media(min-width:1400px){.cl-shell{max-width:1200px}.cl-layout{grid-template-columns:minmax(0,1fr) 340px;gap:32px}}@media(max-width:900px){.cl-layout{grid-template-columns:minmax(0,1fr) 280px;gap:18px}.cl-shell{padding:24px}.cl-form-heading,.cl-section,.cl-form-footer{padding:23px}.cl-preview{padding:19px}.cl-category-grid{gap:8px}.cl-category{padding:11px}.cl-category small{font-size:8px}.cl-ai-status{font-size:9px}}@media(max-width:740px){.cl-layout{grid-template-columns:1fr}.cl-sidebar{position:static}.cl-heading{padding:36px 0 28px}.cl-heading h1{letter-spacing:-1.6px}.cl-preview{display:none}.cl-tip{margin-top:0}.cl-sidebar-note{display:none}.cl-shell{padding:20px 16px}.cl-form-heading{align-items:flex-start}.cl-form-heading,.cl-section,.cl-form-footer{padding:23px 20px}.cl-heading>p{font-size:12px}.cl-form-heading h2{font-size:21px}.cl-form-heading .cl-eyebrow{font-size:8px}.cl-location{padding:12px;gap:9px}.cl-locate{padding:8px}.cl-location-icon{width:32px;height:32px}.cl-success{padding:35px 20px}.cl-success h2{font-size:26px}.cl-desktop-break{display:none}}@media(max-width:380px){.cl-category-grid{grid-template-columns:repeat(2,1fr)}.cl-search-row{flex-wrap:wrap}.cl-search-row>label{flex-basis:100%}.cl-ai-status{padding:6px;font-size:8px}.cl-heading>.cl-eyebrow{font-size:8px;letter-spacing:1px}}@media(prefers-reduced-motion:reduce){.cl-report *,.cl-report *:before,.cl-report *:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;