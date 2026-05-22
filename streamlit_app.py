import json
import os

import requests
import streamlit as st


st.set_page_config(page_title='AI Summarizer', layout='wide')

st.title('AI Summarizer — Streamlit Frontend')

def get_default_backend_url():
    backend_url = os.getenv('BACKEND_URL', '')

    try:
        backend_url = st.secrets.get('BACKEND_URL', backend_url)
    except Exception:
        pass

    return backend_url


# Backend URL can be provided via BACKEND_URL or Streamlit secrets, or entered here.
default_backend = get_default_backend_url()
backend_url = st.text_input('Backend base URL (e.g. https://your-backend.example.com)', value=default_backend)

st.markdown('Enter text below or upload a file and click **Summarize**. The app will stream tokens from the backend.')

col1, col2 = st.columns([3, 1])

with col1:
    text = st.text_area('Text to summarize', height=300)
    uploaded_file = st.file_uploader('Or upload a text file', type=['txt', 'md'])
    if uploaded_file and not text:
        try:
            raw = uploaded_file.read()
            text = raw.decode('utf-8', errors='replace')
        except Exception:
            text = str(uploaded_file.read())

with col2:
    length = st.selectbox('Length', ['Short', 'Medium', 'Long'], index=1)
    format_opt = st.selectbox('Format', ['Paragraph', 'Bulleted', 'Headlines'], index=0)
    tone = st.selectbox('Tone', ['Neutral', 'Formal', 'Casual'], index=0)
    submit = st.button('Summarize')


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
            st.write('---')
            st.subheader('Final Summary')
            st.write(summary)
