"use strict";
// SPDX-License-Identifier: GPL-3.0-or-later
// myMPD (c) 2018-2023 Juergen Mang <mail@jcgames.de>
// https://github.com/jcorporation/mympd

/** @module modalScripts_js */

/**
 * Initialization functions for the script elements
 * @returns {void}
 */
function initModalScripts() {
    elGetById('inputScriptArgument').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
            addScriptArgument();
        }
    }, false);

    elGetById('selectScriptArguments').addEventListener('click', function(event) {
        if (event.target.nodeName === 'OPTION') {
            removeScriptArgument(event);
            event.stopPropagation();
        }
    }, false);

    elGetById('listScriptsList').addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        if (event.target.nodeName === 'A') {
            const action = getData(event.target, 'action');
            const script = getData(event.target.parentNode.parentNode, 'script');
            switch(action) {
                case 'delete':
                    deleteScript(event.target, script);
                    break;
                case 'execute':
                    execScript(getData(event.target.parentNode.parentNode, 'href'));
                    break;
                case 'add2home':
                    addScriptToHome(script, getData(event.target.parentNode.parentNode, 'href'));
                    break;
                default:
                    logError('Invalid action: ' + action);
            }
            return;
        }

        const target = event.target.closest('TR');
        if (checkTargetClick(target) === true) {
            showEditScript(getData(target, 'script'));
        }
    }, false);

    elGetById('btnDropdownAddAPIcall').parentNode.addEventListener('show.bs.dropdown', function() {
        const dw = elGetById('textareaScriptContent').offsetWidth - elGetById('btnDropdownAddAPIcall').parentNode.offsetLeft;
        elGetById('dropdownAddAPIcall').style.width = dw + 'px';
    }, false);

    elGetById('btnDropdownAddFunction').parentNode.addEventListener('show.bs.dropdown', function() {
        const dw = elGetById('textareaScriptContent').offsetWidth - elGetById('btnDropdownAddFunction').parentNode.offsetLeft;
        elGetById('dropdownAddFunction').style.width = dw + 'px';
    }, false);

    elGetById('btnDropdownImportScript').parentNode.addEventListener('show.bs.dropdown', function() {
        const dw = elGetById('textareaScriptContent').offsetWidth - elGetById('btnDropdownImportScript').parentNode.offsetLeft;
        elGetById('dropdownImportScript').style.width = dw + 'px';
        getImportScriptList();
    }, false);

    elGetById('btnImportScript').addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        const script = getSelectValueId('selectImportScript');
        if (script === '') {
            return;
        }
        getImportScript(script);
        BSN.Dropdown.getInstance(elGetById('btnDropdownImportScript')).hide();
        setFocusId('textareaScriptContent');
    }, false);

    const selectAPIcallEl = elGetById('selectAPIcall');
    elClear(selectAPIcallEl);
    selectAPIcallEl.appendChild(
        elCreateTextTn('option', {"value": ""}, 'Select method')
    );
    for (const m of Object.keys(APImethods).sort()) {
        selectAPIcallEl.appendChild(
            elCreateText('option', {"value": m}, m)
        );
    }

    selectAPIcallEl.addEventListener('click', function(event) {
        event.stopPropagation();
    }, false);

    selectAPIcallEl.addEventListener('change', function(event) {
        const value = getSelectValue(event.target);
        elGetById('APIdesc').textContent = value !== '' ? APImethods[value].desc : '';
    }, false);

    elGetById('btnAddAPIcall').addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        const method = getSelectValueId('selectAPIcall');
        if (method === '') {
            return;
        }
        const el = elGetById('textareaScriptContent');
        const [start, end] = [el.selectionStart, el.selectionEnd];
        const newText =
            'options = {}\n' +
            apiParamsToArgs(APImethods[method].params) +
            'rc, result = mympd.api("' + method + '", options)\n' +
            'if rc == 0 then\n' +
            '\n' +
            'end\n';
        el.setRangeText(newText, start, end, 'preserve');
        BSN.Dropdown.getInstance(elGetById('btnDropdownAddAPIcall')).hide();
        setFocus(el);
    }, false);

    const selectFunctionEl = elGetById('selectFunction');
    elClear(selectFunctionEl);
    selectFunctionEl.appendChild(
        elCreateTextTn('option', {"value": ""}, 'Select function')
    );
    for (const m in LUAfunctions) {
        selectFunctionEl.appendChild(
            elCreateText('option', {"value": m}, m)
        );
    }

    selectFunctionEl.addEventListener('click', function(event) {
        event.stopPropagation();
    }, false);

    selectFunctionEl.addEventListener('change', function(event) {
        const value = getSelectValue(event.target);
        elGetById('functionDesc').textContent = value !== '' ? LUAfunctions[value].desc : '';
    }, false);

    elGetById('btnAddFunction').addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();
        const value = getSelectValueId('selectFunction');
        if (value === '') {
            return;
        }
        const el = elGetById('textareaScriptContent');
        const [start, end] = [el.selectionStart, el.selectionEnd];
        el.setRangeText(LUAfunctions[value].func, start, end, 'end');
        BSN.Dropdown.getInstance(elGetById('btnDropdownAddFunction')).hide();
        setFocus(el);
    }, false);
}

/**
 * Fetches the list of available scripts to import
 * @returns {void}
 */
function getImportScriptList() {
    const sel = elGetById('selectImportScript');
    sel.setAttribute('disabled', 'disabled');
    httpGet(subdir + '/proxy?uri=' + myEncodeURI('https://jcorporation.github.io/myMPD/scripting/scripts/index.json'), function(obj) {
        sel.options.length = 0;
        for (const script of obj.scripts) {
            sel.appendChild(
                elCreateText('option', {"value": script}, script)
            );
        }
        sel.removeAttribute('disabled');
    }, true);
}

/**
 * Imports a script
 * @param {string} script script to import
 * @returns {void}
 */
function getImportScript(script) {
    elGetById('textareaScriptContent').setAttribute('disabled', 'disabled');
    httpGet(subdir + '/proxy?uri=' + myEncodeURI('https://jcorporation.github.io/myMPD/scripting/scripts/' + script), function(text) {
        const lines = text.split('\n');
        const firstLine = lines.shift();
        let obj;
        try {
            obj = JSON.parse(firstLine.substring(firstLine.indexOf('{')));
        }
        catch(error) {
            showNotification(tn('Can not parse script arguments'), 'general', 'error');
            logError('Can not parse script arguments:' + firstLine);
            return;
        }
        const scriptArgEl = elGetById('selectScriptArguments');
        scriptArgEl.options.length = 0;
        for (let i = 0, j = obj.arguments.length; i < j; i++) {
            scriptArgEl.appendChild(
                elCreateText('option', {}, obj.arguments[i])
            );
        }
        elGetById('textareaScriptContent').value = lines.join('\n');
        elGetById('textareaScriptContent').removeAttribute('disabled');
    }, false);
}

/**
 * Adds the documented api params to the options lua table for the add api call function
 * @param {object} p parameters object
 * @returns {string} lua code
 */
function apiParamsToArgs(p) {
    let args = '';
    for (const param in p) {
        args += 'options["' + param + '"] = ';
        switch(p[param].type) {
            case APItypes.string:
                args += '"' + p[param].example + '"';
                break;
            case APItypes.array:
                args += '{' + p[param].example.slice(1, -1) + '}';
                break;
            case APItypes.object: {
                args += '{}';
                break;
            }
            default:
                args += p[param].example;
        }
        args += '\n';
    }
    return args;
}

/**
 * Saves a script
 * @returns {void}
 */
//eslint-disable-next-line no-unused-vars
function saveScript() {
    cleanupModalId('modalScripts');
    let formOK = true;

    const nameEl = elGetById('inputScriptName');
    if (!validatePlistEl(nameEl)) {
        formOK = false;
    }

    const orderEl = elGetById('inputScriptOrder');
    if (!validateIntEl(orderEl)) {
        formOK = false;
    }

    if (formOK === true) {
        const args = [];
        const argSel = elGetById('selectScriptArguments');
        for (let i = 0, j = argSel.options.length; i < j; i++) {
            args.push(argSel.options[i].text);
        }
        sendAPI("MYMPD_API_SCRIPT_SAVE", {
            "oldscript": elGetById('inputOldScriptName').value,
            "script": nameEl.value,
            "order": Number(orderEl.value),
            "content": elGetById('textareaScriptContent').value,
            "arguments": args
        }, saveScriptCheckError, true);
    }
}

/**
 * Handler for the MYMPD_API_SCRIPT_SAVE jsonrpc response
 * @param {object} obj jsonrpc response
 * @returns {void}
 */
function saveScriptCheckError(obj) {
    if (obj.error) {
        showModalAlert(obj);
    }
    else {
        showListScripts();
    }
}

/**
 * Validates a script
 * @returns {void}
 */
//eslint-disable-next-line no-unused-vars
function validateScript() {
    cleanupModalId('modalScripts');
    let formOK = true;

    const nameEl = elGetById('inputScriptName');
    if (!validatePlistEl(nameEl)) {
        formOK = false;
    }

    const orderEl = elGetById('inputScriptOrder');
    if (!validateIntEl(orderEl)) {
        formOK = false;
    }

    if (formOK === true) {
        sendAPI("MYMPD_API_SCRIPT_VALIDATE", {
            "script": nameEl.value,
            "content": elGetById('textareaScriptContent').value,
        }, validateScriptCheckError, true);
    }
}

/**
 * Handler for the MYMPD_API_SCRIPT_VALIDATE jsonrpc response
 * @param {object} obj jsonrpc response
 * @returns {void}
 */
function validateScriptCheckError(obj) {
    if (obj.error) {
        showModalAlert(obj);
    }
    else {
        showModalInfo('Script syntax is valid');
    }
}

/**
 * Appends an argument to the list of script arguments
 * @returns {void}
 */
function addScriptArgument() {
    const el = elGetById('inputScriptArgument');
    if (validatePrintableEl(el)) {
        elGetById('selectScriptArguments').appendChild(
            elCreateText('option', {}, el.value)
        );
        el.value = '';
    }
}

/**
 * Removes an argument from the list of script arguments
 * @param {Event} ev triggering element
 * @returns {void}
 */
function removeScriptArgument(ev) {
    const el = elGetById('inputScriptArgument');
    // @ts-ignore
    el.value = ev.target.text;
    ev.target.remove();
    setFocus(el);
}

/**
 * Opens the scripts modal and shows the edit tab
 * @param {string} script name to edit
 * @returns {void}
 */
//eslint-disable-next-line no-unused-vars
function showEditScriptModal(script) {
    uiElements.modalScripts.show();
    showEditScript(script);
}

/**
 * Opens the scripts modal and shows the list tab
 * @returns {void}
 */
//eslint-disable-next-line no-unused-vars
function showListScriptModal() {
    uiElements.modalScripts.show();
    showListScripts();
}

/**
 * Shows the edit script tab
 * @param {string} script script name
 * @returns {void}
 */
//eslint-disable-next-line no-unused-vars
function showEditScript(script) {
    cleanupModalId('modalScripts');
    elGetById('textareaScriptContent').removeAttribute('disabled');
    elGetById('listScripts').classList.remove('active');
    elGetById('editScript').classList.add('active');
    elHideId('listScriptsFooter');
    elShowId('editScriptFooter');

    if (script !== '') {
        sendAPI("MYMPD_API_SCRIPT_GET", {"script": script}, parseEditScript, false);
    }
    else {
        elGetById('inputOldScriptName').value = '';
        elGetById('inputScriptName').value = '';
        elGetById('inputScriptOrder').value = '1';
        elGetById('inputScriptArgument').value = '';
        elClearId('selectScriptArguments');
        elGetById('textareaScriptContent').value = '';
    }
    setFocusId('inputScriptName');
}

/**
 * Parses the MYMPD_API_SCRIPT_GET jsonrpc response
 * @param {object} obj jsonrpc response
 * @returns {void}
 */
function parseEditScript(obj) {
    elGetById('inputOldScriptName').value = obj.result.script;
    elGetById('inputScriptName').value = obj.result.script;
    elGetById('inputScriptOrder').value = obj.result.metadata.order;
    elGetById('inputScriptArgument').value = '';
    const selSA = elGetById('selectScriptArguments');
    selSA.options.length = 0;
    for (let i = 0, j = obj.result.metadata.arguments.length; i < j; i++) {
        selSA.appendChild(
            elCreateText('option', {}, obj.result.metadata.arguments[i])
        );
    }
    elGetById('textareaScriptContent').value = obj.result.content;
}

/**
 * Shows the list scripts tab
 * @returns {void}
 */
function showListScripts() {
    cleanupModalId('modalScripts');
    elGetById('listScripts').classList.add('active');
    elGetById('editScript').classList.remove('active');
    elShowId('listScriptsFooter');
    elHideId('editScriptFooter');
    getScriptList(true);
}

/**
 * Deletes a script after confirmation
 * @param {EventTarget} el triggering element
 * @param {string} script script to delete
 * @returns {void}
 */
function deleteScript(el, script) {
    showConfirmInline(el.parentNode.previousSibling, tn('Do you really want to delete the script?', {"script": script}), tn('Yes, delete it'), function() {
        sendAPI("MYMPD_API_SCRIPT_RM", {
            "script": script
        }, deleteScriptCheckError, true);
    });
}

/**
 * Handler for the MYMPD_API_SCRIPT_RM jsonrpc response
 * @param {object} obj jsonrpc response
 * @returns {void}
 */
function deleteScriptCheckError(obj) {
    if (obj.error) {
        showModalAlert(obj);
    }
    else {
        getScriptList(true);
    }
}

/**
 * Gets the list of scripts
 * @param {boolean} all true = get all scripts, false = get all scripts with pos > 0
 * @returns {void}
 */
function getScriptList(all) {
    sendAPI("MYMPD_API_SCRIPT_LIST", {
        "all": all
    }, parseScriptList, true);
}

/**
 * Parses the MYMPD_API_SCRIPT_LIST jsonrpc response
 * @param {object} obj jsonrpc response
 * @returns {void}
 */
function parseScriptList(obj) {
    const tbodyScripts = elGetById('listScriptsList');
    elClear(tbodyScripts);
    const mainmenuScripts = elGetById('scripts');
    elClear(mainmenuScripts);
    const triggerScripts = elGetById('selectTriggerScript');
    elClear(triggerScripts);

    if (checkResult(obj, tbodyScripts) === false) {
        return;
    }

    const timerActions = elCreateEmpty('optgroup', {"id": "timerActionsScriptsOptGroup", "label": tn('Script')});
    setData(timerActions, 'value', 'script');
    const scriptListLen = obj.result.data.length;
    if (scriptListLen > 0) {
        obj.result.data.sort(function(a, b) {
            return a.metadata.order - b.metadata.order;
        });
        for (let i = 0; i < scriptListLen; i++) {
            //scriptlist in main menu
            if (obj.result.data[i].metadata.order > 0) {
                const a = elCreateNodes('a', {"class": ["dropdown-item", "alwaysEnabled", "py-2"], "href": "#"}, [
                    elCreateText('span', {"class": ["mi", "me-2"]}, "code"),
                    elCreateText('span', {}, obj.result.data[i].name)
                ]);
                setData(a, 'href', {"script": obj.result.data[i].name, "arguments": obj.result.data[i].metadata.arguments});
                mainmenuScripts.appendChild(a);
            }
            //scriptlist in scripts modal
            const tr = elCreateNodes('tr', {"title": tn('Edit')}, [
                elCreateText('td', {}, obj.result.data[i].name),
                elCreateNodes('td', {"data-col": "Action"}, [
                    elCreateText('a', {"href": "#", "data-title-phrase": "Delete", "data-action": "delete", "class": ["me-2", "mi", "color-darkgrey"]}, 'delete'),
                    elCreateText('a', {"href": "#", "data-title-phrase": "Execute", "data-action": "execute", "class": ["me-2", "mi", "color-darkgrey"]}, 'play_arrow'),
                    elCreateText('a', {"href": "#", "data-title-phrase": "Add to homescreen", "data-action": "add2home", "class": ["me-2", "mi", "color-darkgrey"]}, 'add_to_home_screen')
                ])
            ]);
            setData(tr, 'script', obj.result.data[i].name);
            setData(tr, 'href', {"script": obj.result.data[i].name, "arguments": obj.result.data[i].metadata.arguments});
            tbodyScripts.appendChild(tr);

            //scriptlist select for timers
            const option = elCreateText('option', {"value": obj.result.data[i].name}, obj.result.data[i].name);
            setData(option, 'arguments', {"arguments": obj.result.data[i].metadata.arguments});
            timerActions.appendChild(option);
            //scriptlist select for trigger
            const option2 = option.cloneNode(true);
            setData(option2, 'arguments', {"arguments": obj.result.data[i].metadata.arguments});
            triggerScripts.appendChild(option2);
        }
    }

    if (scriptListLen === 0) {
        elHide(mainmenuScripts.previousElementSibling);
    }
    else {
        elShow(mainmenuScripts.previousElementSibling);
    }
    //update timer actions select
    const old = elGetById('timerActionsScriptsOptGroup');
    if (old) {
        old.replaceWith(timerActions);
    }
    else {
        elGetById('selectTimerAction').appendChild(timerActions);
    }
}
