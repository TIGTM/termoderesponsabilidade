const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const script = readFileSync(path.join(__dirname, '../frontend/js/login-colaborador.js'), 'utf8');
function setup() {
    const fields = new Map();
    const get = id => {
        if (!fields.has(id)) {
            const classes = new Set(['hidden']);
            fields.set(id, { value: '', type: 'password', textContent: '', handlers: {}, attrs: {},
                classList: { add: x => classes.add(x), remove: x => classes.delete(x),
                    toggle: (x, yes) => yes ? classes.add(x) : classes.delete(x), contains: x => classes.has(x) },
                addEventListener(type, callback) { this.handlers[type] = callback; },
                setAttribute(k,v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; }, focus() { this.focused = true; }
            });
        }
        return fields.get(id);
    };
    const calls = [], replies = [];
    const location = { search: '?perfil=colaborador' };
    vm.runInNewContext(script, { URLSearchParams, AbortSignal, location,
        document: { getElementById: get, querySelector: () => get('subtitle') },
        sessionStorage: { removeItem() {} },
        fetch: async (url, options) => { calls.push({ url, data: JSON.parse(options.body) }); return replies.shift(); }
    });
    const reply = (body, ok = true) => replies.push({ ok, json: async () => body });
    const submit = () => get('acessoColaborador').handlers.submit({ preventDefault() {} });
    get('nomeCompleto').value = 'João Carlos Silva'; get('cpfLogin').value = '529.982.247-25';
    return { get, calls, reply, submit, location };
}
(async () => {
    let t = setup();
    t.reply({ cadastrado: false }); await t.submit();
    assert.equal(t.calls[0].url, '/api/colaborador-auth/identificar');
    assert.equal('senha' in t.calls[0].data, false);
    assert.equal(t.get('confirmacaoSenha').classList.contains('hidden'), false);
    t.get('senhaPessoal').value = 'minha-senha'; t.get('confirmarSenha').value = 'outra'; await t.submit();
    assert.equal(t.calls.length, 1); assert.equal(t.get('confirmarSenha').attrs['aria-invalid'], 'true');
    t.get('confirmarSenha').value = 'minha-senha'; t.reply({}); await t.submit();
    assert.equal(t.calls[1].url, '/api/colaborador-auth/cadastrar'); assert.equal(t.location.href, 'colaborador.html');
    t = setup(); t.reply({ cadastrado: true }); await t.submit();
    assert.equal(t.get('confirmacaoSenha').classList.contains('hidden'), true);
    t.get('senhaPessoal').value = 'incorreta'; t.reply({ mensagem: 'CPF ou senha incorretos.' }, false); await t.submit();
    assert.equal(t.calls[1].url, '/api/colaborador-auth/login'); assert.equal(t.location.href, undefined);
    assert.equal(t.get('continuarLogin').disabled, false);
    assert.equal(t.get('mensagemColaborador').textContent, 'CPF ou senha incorretos.');
    t.reply({}); await t.submit(); assert.equal(t.location.href, 'colaborador.html');
    t.get('alterarIdentificacao').handlers.click(); assert.equal(t.get('senhaPessoal').value, '');
    assert.equal(t.get('nomeCompleto').readOnly, false);
    t = setup(); t.reply({ mensagem: 'CPF inválido.' }, false); await t.submit();
    assert.equal(t.get('cpfLogin').readOnly, false); assert.equal(t.get('continuarLogin').disabled, false);
    t.get('cpfLogin').value = '123'; await t.submit(); assert.equal(t.calls.length, 1);
    console.log('Passed login state checks: registration, confirmation, existing account, wrong password, retry, change identity, invalid CPF.');
})().catch(error => { console.error(error); process.exitCode = 1; });
