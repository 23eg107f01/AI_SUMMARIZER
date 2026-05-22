import json
import os

import requests
import streamlit as st


st.set_page_config(page_title='AI Summarizer', page_icon='✦', layout='wide', initial_sidebar_state='collapsed')

st.markdown(
        '''
        <style>
            .stApp {
                background:
                    radial-gradient(circle at top left, rgba(59, 130, 246, 0.12), transparent 28%),
                    radial-gradient(circle at top right, rgba(16, 185, 129, 0.10), transparent 24%),
                    linear-gradient(180deg, #f8fbff 0%, #ffffff 28%, #f7f9fc 100%);
            }

            .block-container {
                padding-top: 2rem;
                padding-bottom: 2rem;
                max-width: 1240px;
            }

            .hero {
                padding: 1.6rem 1.75rem;
                border: 1px solid rgba(148, 163, 184, 0.22);
                border-radius: 24px;
                background: rgba(255, 255, 255, 0.78);
                backdrop-filter: blur(18px);
                box-shadow: 0 22px 70px rgba(15, 23, 42, 0.08);
                margin-bottom: 1rem;
            }

            .hero h1 {
                margin: 0;
                font-size: 2.2rem;
                line-height: 1.05;
                color: #0f172a;
            }

            .hero p {
                margin: 0.65rem 0 0;
                color: #475569;
                font-size: 1rem;
            }

            .pill-row {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                margin-top: 1rem;
            }

            .pill {
                display: inline-flex;
                align-items: center;
                gap: 0.45rem;
                border-radius: 999px;
                padding: 0.45rem 0.8rem;
                background: rgba(15, 23, 42, 0.05);
                color: #334155;
                font-size: 0.88rem;
                font-weight: 600;
            }

            .card {
                padding: 1rem 1rem 0.85rem;
                border: 1px solid rgba(148, 163, 184, 0.18);
                border-radius: 22px;
                background: rgba(255, 255, 255, 0.84);
                box-shadow: 0 14px 42px rgba(15, 23, 42, 0.05);
            }

            .card h3 {
                margin: 0 0 0.35rem;
                font-size: 1.05rem;
                color: #0f172a;
            }

            .card .subtle {
                color: #64748b;
                font-size: 0.92rem;
                margin: 0 0 0.9rem;
            }

            .summary-box {
                padding: 1rem 1.15rem;
                border-radius: 18px;
                border: 1px solid rgba(148, 163, 184, 0.16);
                background: linear-gradient(180deg, rgba(248, 250, 252, 0.88), rgba(255, 255, 255, 0.96));
            }

            .streamlit-expanderHeader {
                font-weight: 600;
            }
        </style>
        ''',
        unsafe_allow_html=True,
)

def get_default_backend_url():
    backend_url = os.getenv('BACKEND_URL', '')

    try:
        backend_url = st.secrets.get('BACKEND_URL', backend_url)
    except Exception:
        pass

    return backend_url


@st.cache_data(ttl=30)
def check_backend_health(backend_url):
    url = backend_url.rstrip('/') + '/api/health'

    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        payload = response.json()
        return True, payload
    except Exception as error:
        return False, str(error)


default_backend = get_default_backend_url()
backend_url = st.text_input(
    'Backend URL',
    value=default_backend,
    placeholder='https://your-backend.example.com',
    help='Set this in Streamlit secrets as BACKEND_URL or type it here for the current session.',
).strip()

st.markdown(
    '''
    <div class="hero">
      <h1>AI Summarizer</h1>
      <p>Paste text or upload a file, then generate a clean summary through your backend.</p>
      <div class="pill-row">
        <span class="pill">Fast streaming output</span>
        <span class="pill">Backend health check</span>
        <span class="pill">File upload support</span>
      </div>
    </div>
    ''',
    unsafe_allow_html=True,
)

top_left, top_right = st.columns([2, 1])

with top_left:
    st.markdown(
        '''
        <div class="card">
          <h3>Connection</h3>
          <p class="subtle">Point the app at your public backend. The status below updates automatically.</p>
        </div>
        ''',
        unsafe_allow_html=True,
    )

with top_right:
    st.markdown(
        '''
        <div class="card">
          <h3>Quick tips</h3>
          <p class="subtle">Use a public backend URL, then keep Streamlit secrets in sync with your deployment.</p>
        </div>
        ''',
        unsafe_allow_html=True,
    )

status_col1, status_col2, status_col3 = st.columns([1.15, 1, 1])
if backend_url:
    health_ok, health_info = check_backend_health(backend_url)
    with status_col1:
        if health_ok:
            st.success(f'Backend online: {backend_url.rstrip("/")}')
        else:
            st.warning(f'Backend check failed: {health_info}')
    with status_col2:
        if health_ok:
            chroma_state = 'connected' if health_info.get('chromaConnected') else 'not connected'
            st.metric('ChromaDB', chroma_state)
        else:
            st.metric('ChromaDB', 'unknown')
    with status_col3:
        st.metric('Mode', 'Streaming')
else:
    with status_col1:
        st.info('Enter a backend URL to enable health checks and summarization.')
    with status_col2:
        st.metric('ChromaDB', 'unknown')
    with status_col3:
        st.metric('Mode', 'Idle')

st.markdown('---')

st.markdown('''<div class="card"><h3>Summarize content</h3><p class="subtle">Choose the tone and output style, then stream the summary from the backend.</p></div>''', unsafe_allow_html=True)

input_col, options_col = st.columns([2.1, 1])

with input_col:
    text = st.text_area('Text to summarize', height=320, placeholder='Paste text here or upload a file on the right.')
    uploaded_file = st.file_uploader('Or upload a text file', type=['txt', 'md'])
    if uploaded_file and not text:
        try:
            raw = uploaded_file.read()
            text = raw.decode('utf-8', errors='replace')
        except Exception:
            text = str(uploaded_file.read())

with options_col:
    length = st.selectbox('Length', ['Short', 'Medium', 'Long'], index=1)
    format_opt = st.selectbox('Format', ['Paragraph', 'Bulleted', 'Headlines'], index=0)
    tone = st.selectbox('Tone', ['Neutral', 'Formal', 'Casual'], index=0)
    submit = st.button('Summarize', use_container_width=True, type='primary')


def parse_sse(response):
    event = None
    data = None
    for raw in response.iter_lines(decode_unicode=True):
        if raw is None:
            continue
        line = raw.strip()
        if not line:
            if event and data is not None:
                # yield and reset
                try:
                    parsed = json.loads(data)
                except Exception:
                    parsed = data
                yield event, parsed
                event = None
                data = None
            continue

        if line.startswith('event:'):
            event = line[len('event:'):].strip()
        elif line.startswith('data:'):
            part = line[len('data:'):].strip()
            data = f"{data}\n{part}" if data else part


def stream_summary(backend_url, payload):
    url = backend_url.rstrip('/') + '/api/summarize'
    try:
        resp = requests.post(url, json=payload, stream=True, timeout=None)
    except Exception as e:
        st.error(f'Failed to connect to backend: {e}')
        return None, True

    if resp.status_code >= 400:
        # try to read json
        try:
            err = resp.json()
        except Exception:
            err = resp.text
        st.error(f'Backend error: {err}')
        return None, True

    summary_accum = ''
    placeholder = st.empty()
    with st.spinner('Summarizing...'):
        for evt, payload in parse_sse(resp):
            if evt == 'token':
                token = payload.get('token') if isinstance(payload, dict) else str(payload)
                summary_accum += token
                placeholder.markdown(summary_accum)
            elif evt == 'done':
                final = payload.get('summary') if isinstance(payload, dict) else str(payload)
                placeholder.markdown(final)
                return final, False
            elif evt == 'error':
                msg = payload.get('error') if isinstance(payload, dict) else str(payload)
                st.error(f'Error from backend: {msg}')
                return None, True

    return summary_accum, False


if submit:
    if not backend_url:
        st.error('Please set the backend URL (or add `BACKEND_URL` to Streamlit secrets).')
    elif not text or not text.strip():
        st.error('Please provide text to summarize or upload a file.')
    else:
        payload = {
            'text': text,
            'length': length,
            'format': format_opt,
            'tone': tone,
        }
        summary, failed = stream_summary(backend_url, payload)
        if summary and not failed:
            st.success('Summary complete')
            with st.container(border=True):
                st.subheader('Final Summary')
                st.caption('Your streamed result is shown below.')
                st.markdown(summary)
