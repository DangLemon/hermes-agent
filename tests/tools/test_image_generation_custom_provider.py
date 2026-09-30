from __future__ import annotations

import base64
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import pytest
import yaml

PNG = base64.b64decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk'
    '+P+/HgAFeALBjdj6MwAAAABJRU5ErkJggg=='
)


def _auto_config(base_url):
    return {
        'model': {'provider': 'company', 'default': 'chat-model'},
        'providers': {'company': {
            'base_url': base_url, 'key_env': 'COMPANY_IMAGE_TEST_KEY',
            'extra_headers': {'X-Company': 'image-test'},
            'models': {
                'vision-chat-model': {'input_modalities': ['text', 'image'], 'output_modalities': ['text']},
                'studio-render': {
                    'input_modalities': ['text'], 'output_modalities': ['image'],
                    'image_generation': {'protocol': 'images', 'priority': 20},
                },
                'studio-default': {
                    'input_modalities': ['text'], 'output_modalities': ['image'],
                    'image_generation': {'protocol': 'images', 'default': True},
                },
            },
        }},
    }

def _patch_cached_catalog(monkeypatch, config):
    catalog = dict(config['providers']['company']['models'])
    monkeypatch.setattr('lemon_cli.models.cached_api_model_catalog', lambda *a, **k: catalog)


def _image_model(protocol):
    meta = {'protocol': protocol, 'default': True}
    if protocol == 'responses':
        meta['request_model'] = 'chat-orchestrator'
    return {'input_modalities': ['text'], 'output_modalities': ['image'], 'image_generation': meta}


@pytest.mark.parametrize('protocol,path', [
    ('images', '/v1/images/generations'),
    ('chat_completions', '/v1/chat/completions'),
    ('responses', '/v1/responses'),
])
@pytest.mark.parametrize('terminal_failure', [False, True])


def test_automatic_image_route_uses_protocol_metadata_and_materializes_artifact(tmp_path, monkeypatch, protocol, path, terminal_failure):
    from lemon_cli.tools_config import _toolset_has_keys
    from lemon_cli.tools_config_providers import _toolset_needs_configuration_prompt
    from tools import image_generation_tool as image
    from tools.registry import registry

    received = []
    data_url = 'data:image/png;base64,' + base64.b64encode(PNG).decode('ascii')

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_POST(self):
            received.append((self.path, dict(self.headers), json.loads(
                self.rfile.read(int(self.headers['Content-Length'])))))
            if terminal_failure:
                self.send_response(200 if protocol == 'responses' else 503)
                self.send_header('Content-Type', 'text/event-stream' if protocol == 'responses' else 'application/json')
                self.end_headers()
                if protocol == 'responses':
                    events = [
                        {'type': 'response.output_item.done', 'item': {'type': 'image_generation_call', 'result': base64.b64encode(PNG).decode()}},
                        {'type': 'response.failed'},
                    ]
                    for event in events:
                        self.wfile.write(('data: ' + json.dumps(event) + '\n\n').encode())
                else:
                    self.wfile.write(b'{"error":{"message":"Provider unavailable"}}')
                return
            if self.path == '/v1/images/generations':
                body = json.dumps({'data': [{'url': f'http://127.0.0.1:{self.server.server_port}/image.png'}]}).encode()
            elif self.path == '/v1/chat/completions':
                body = json.dumps({'choices': [{'message': {'images': [{'image_url': {'url': data_url}}]}}]}).encode()
            else:
                body = json.dumps({'output': [{'type': 'image_generation_call', 'result': base64.b64encode(PNG).decode('ascii')}]}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            self.send_response(200)
            self.send_header('Content-Type', 'image/png')
            self.send_header('Content-Length', str(len(PNG)))
            self.end_headers()
            self.wfile.write(PNG)

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        config = _auto_config(f'http://127.0.0.1:{server.server_port}/v1')
        config['providers']['company']['models'] = {
            'vision-chat-model': {'input_modalities': ['text', 'image'], 'output_modalities': ['text']},
            'vendor/alias-render': _image_model(protocol),
        }
        _patch_cached_catalog(monkeypatch, config)
        monkeypatch.setenv('LEMON_HOME', str(tmp_path))
        monkeypatch.setenv('COMPANY_IMAGE_TEST_KEY', 'company-test-secret')
        (tmp_path / 'config.yaml').write_text(yaml.safe_dump(config))
        assert image.check_image_generation_requirements()
        assert _toolset_has_keys('image_gen', config)
        assert not _toolset_needs_configuration_prompt('image_gen', config)
        schema = image._build_dynamic_image_schema()
        assert 'image_url' not in schema['parameters']['properties']
        result = json.loads(registry.dispatch('image_generate', {'prompt': 'A blue circle', 'aspect_ratio': 'square'}))
        if terminal_failure:
            assert result['success'] is False
            assert result['error_type'] == 'api_error'
            assert [item[0] for item in received] == [path]
            return
        assert result['success'], result
        assert Path(result['image']).read_bytes() == PNG
        assert result['model'] == 'vendor/alias-render'
        actual_path, headers, request = received[0]
        assert actual_path == path
        assert headers['Authorization'] == 'Bearer company-test-secret'
        assert headers['X-Company'] == 'image-test'
        if protocol == 'responses':
            assert request['model'] == 'chat-orchestrator'
            assert request['tools'] == [{'type': 'image_generation', 'model': 'vendor/alias-render', 'size': '1024x1024'}]
        else:
            assert request['model'] == 'vendor/alias-render'
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def test_automatic_selection_respects_precedence_and_never_falls_through(tmp_path, monkeypatch):
    from tools import image_generation_tool as image
    from lemon_cli import runtime_provider_custom

    monkeypatch.setenv('LEMON_HOME', str(tmp_path))
    config = _auto_config('https://company.example/v1')
    config_path = tmp_path / 'config.yaml'
    for selection in ({'provider': 'openai'}, {'model': 'fal-ai/model'}, {'use_gateway': True}):
        assert image.resolve_auto_custom_image_binding(
            {**config, 'image_gen': selection}, include_runtime=False) is None
    unsupported = _auto_config('https://company.example/v1')
    unsupported['providers']['company']['models'] = {
        'vision-chat-model': {'input_modalities': ['text', 'image'], 'output_modalities': ['text']},
        'kind-only-image': {'kind': 'image'},
    }
    _patch_cached_catalog(monkeypatch, unsupported)
    assert image.resolve_auto_custom_image_binding(unsupported, include_runtime=False) is None
    priority = _auto_config('https://company.example/v1')
    priority['providers']['company']['models']['unprioritized'] = {
        'input_modalities': ['text'], 'output_modalities': ['image'],
        'image_generation': {'protocol': 'images', 'default': True},
    }
    _patch_cached_catalog(monkeypatch, priority)
    assert image.resolve_auto_custom_image_binding(priority, include_runtime=False)['model'] == 'studio-default'
    config_path.write_text(yaml.safe_dump(config))
    _patch_cached_catalog(monkeypatch, config)

    def credential_failure(**_kwargs):
        raise ValueError('Credential unavailable')

    monkeypatch.setattr(runtime_provider_custom, '_resolve_named_custom_runtime', credential_failure)
    # Selection and schema do not mint credentials; execution must report this route's error.
    assert image.check_image_generation_requirements()
    result = json.loads(image._handle_image_generate({'prompt': 'A blue circle'}))
    assert result['success'] is False
    assert result['error_type'] == 'auth_required'
    assert 'Credential unavailable' in result['error']


