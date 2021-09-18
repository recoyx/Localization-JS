import getCountryName from 'country-name';
import countryISO2To3 from 'country-iso-2-to-3';
import LanguageTags from 'language-tags';
import LanguageNameMap from 'language-name-map';
import HttpRequest from 'axios';
import { EventTarget } from 'event-target-shim';
import loadViaFs from './fs-load-4-nodejs.js';

const { getLangNameFromCode } = LanguageNameMap;

export class Locale {
    constructor(id, constructorKey = null) {
        if (constructorKey != Locale._constructorKey) {
            throw new Error('Illegal constructor for Locale.');
        }
        let tag = LanguageTags(id);
        if (tag && tag.subtags().length == 1) {
            switch (tag.subtags()[0].format().toLowerCase()) {
                case 'br': tag = LanguageTags('pt-BR'); break;
                case 'us':
                case 'usa': tag = LanguageTags('en-US'); break;
                case 'jp': tag = LanguageTags('ja'); break;
            }
        }
        if (!tag || !tag.language() || !getLangNameFromCode(tag.language().format())) {
            throw new Error("Invalid language identifier.");
        }
        this._tag = tag;
    }

    get standardTag() {
        return this._tag;
    }

    _getBasicInfo() {
        return getLangNameFromCode(this._tag.language().format());
    }

    get direction() {
        let info = this._getBasicInfo();
        return info.dir == 1 ? 'leftToRight' : 'rightToLeft';
    }

    get internationalName() {
        return this._getBasicInfo().name;
    }

    get nativeName() {
        let { country } = this;
        return this._getBasicInfo().native + (country ? ` (${ country.getName(this) })` : '');
    }

    get country() {
        let r = this._tag.region();
        if (r) {
            let c = parseCountry(r.format().toUpperCase());
            if (c) {
                return c;
            }
        }
        switch (this._tag.format().toLowerCase()) {
            case 'fr': return parseCountry('FRA');
            case 'ja': return parseCountry('JPN');
            case 'ru': return parseCountry('RUS');
        }
        return null;
    }

    toString() {
        return this._tag.format();
    }
}

Locale._constructorKey = {};

export class Country {
    constructor(id, key = undefined) {
        if (key != Country._constructorKey) {
            throw new Error('Illegal constructor for Country.');
        }
        id = id.toUpperCase();
        id = id.length == 2 ? countryISO2To3(id) : id;
        if (!getCountryName(id, 'en')) {
            throw new Error('Invalid country identifier.');
        }
        this._id = id;
    }

    get internationalName() {
        return this.getName(parseLocale('en'));
    }

    getName(locale) {
        return getCountryName(this._id, locale.standardTag.language().format());
    }

    toString() {
        return this._id;
    }
}

Country._constructorKey = {};

const localePool = new Map;

export function parseLocale(id) {
    try {
        id = new Locale(id, Locale._constructorKey).toString();
        let r = localePool.get(id);
        if (!r) {
            localePool.set(id, r = new Locale(id, Locale._constructorKey));
        }
        return r;
    } catch (e) {
        return null;
    }
}

function parseLocaleOpt(id) {
    return id instanceof Locale ? id : parseLocale(id);
}

const countryPool = new Map;

export function parseCountry(id) {
    try {
        let k = new Country(id, Country._constructorKey);
        id = k.toString();
        let r = countryPool.get(id);
        if (!r) {
            countryPool.set(id, k);
            r = k;
        }
        return r;
    } catch (e) {
        return null;
    }
}

export class MsgLocalization extends EventTarget {
    constructor(options = null) {
        super();
        this._assets = new Map;
        this._supportsLocales = new Set;
        this._localeDirName = new Map;
        this._defaultLocale = null;
        this._currentLocale = null;
        this._fallbacks = new Map;
        this._assetSrc = '';
        this._assetFiles = [];
        this._cleanUnusedAssets = false;
        this._loadAssetsVia = 'http';

        options = options || {};

        for (let locale of options.supportsLocales) {
            let localeRef = parseLocaleOpt(locale);
            if (localeRef != null) {
                this._supportsLocales.add(localeRef);
                this._localeDirName.set(localeRef, locale.toString());
            }
        }

        this._defaultLocale = parseLocaleOpt(options.defaultLocale);

        for (let [k, v] of Object.entries(options.fallbacks || {})) {
            let v2 = v instanceof Array ? v : [v];
            let localeRef = parseLocaleOpt(k);
            if (localeRef != null) {
                this._fallbacks.set(localeRef, v2.map(e => parseLocaleOpt(e)).filter(l => l != null));
            }
        }

        this._assetSrc = options.assets.src || '';
        this._assetFiles = options.assets.files.slice(0).map(f => f.replace(/\.json$/, ''));
        this._cleanUnusedAssets = options.assets.cleanUnusedAssets == undefined ? false : !!options.assets.cleanUnusedAssets;
        this._loadAssetsVia = options.assets.loadAssetsVia || 'http';
    }

    get supportedLocales() {
        return new Set(this._supportsLocales.values());
    }

    supportsLocale(arg) {
        return this._supportsLocales.has(arg);
    }

    get currentLocale() {
        return this._currentLocale;
    }

    get currentLocaleSequence() {
        if (this._currentLocale == null) {
            return [];
        }
        let r = [];
        const collect = locale => {
            r.push(locale);
            for (let fl of this._fallbacks.get(locale) || []) {
                collect(fl);
            }
        }
        collect(this._currentLocale);
        return r;
    }

    get currentLocaleSequenceStr() {
        return this.currentLocaleSequence.map(l => l.toString());
    }

    async load(newLocale = null) {
        if (!newLocale) newLocale = this._defaultLocale;
        if (newLocale == this._currentLocale) {
            this.dispatchEvent(new LocaleEvent('localeload'));
            return true;
        }
        if (!newLocale) throw new Error('Locale argument must be specified.');
        if (!this.supportsLocale(newLocale)) throw new Error(`Unsupported locale: ${newLocale.toString()}`);

        let toLoad = new Set;
        toLoad.add(newLocale);
        this._enumerateFallbacks(newLocale, toLoad);

        let newAssets = new Map;
        for (let locale of toLoad) {
            let res = await this._loadSingleLocale(locale);
            if (!res) {
                return false;
            }
            newAssets.set(locale, res);
        }

        // clean unused assets
        if (this._cleanUnusedAssets) this._assets.clear();

        for (let [locale, root] of newAssets) {
            this._assets.set(locale, root);
        }

        this._currentLocale = newLocale;
        this.dispatchEvent(new LocaleEvent('localeload'));
        return true;
    }

    async _loadSingleLocale(locale) {
        let r = {};
        let dirName = this._localeDirName.get(locale);
        if (!dirName) {
            throw new Error(`Fallback locale is not a supported locale: ${locale.toString()}`);
        }
        for (let file of this._assetFiles) {
            let resPath = `${this._assetSrc}/${dirName}/${file}.json`;
            let content = '';
            try {
                if (this._loadAssetsVia == 'fileSystem') {
                    content = await loadViaFs(resPath);
                } else {
                    content = await HttpRequest.get(resPath, {
                        responseType: 'json',
                    });
                }
            } catch (e) {
            }
            if (!content) {
                console.error(`Failed to load resource at ${resPath}`);
                return null;
            }
            this._setResourceDeep(file, content, r);
        }
        return r;
    }

    _setResourceDeep(name, assign, output) {
        let names = name.split('/');
        let lastName = names.pop();
        names = names.concat(lastName.split('.'));
        lastName = names.pop();
        for (let name of names) {
            let r = output[name];
            if (r === undefined || r === null || r.constructor != Object)
                output[name] = {};
            output = output[name];
        }
        output[lastName] = assign;
    }

    _enumerateFallbacks(locale, output) {
        let list = this._fallbacks.get(locale);
        if (!list) return;
        for (let item of list) {
            output.add(item);
            this._enumerateFallbacks(item, output);
        }
    }

    t(id, ...options) {
        let vars = null;
        let gender = null;
        let pluralRuleSelector = null;

        for (let option of options) {
            if (option instanceof Gender) {
                gender = option;
            } else if (option instanceof PluralRuleSelector) {
                pluralRuleSelector = option;
            } else if (!!option && option instanceof Map) {
                vars = vars || {};
                for (let k in option) {
                    vars.set(k, option instanceof Intl.DateTimeFormat ? option : String(option[k]));
                }
            } else if (!!option && option.constructor == Object) {
                vars = vars || {};
                for (let k in option) {
                    vars[k] = option instanceof Intl.DateTimeFormat ? option : String(option[k]);
                }
            }
        }

        vars = vars == null ? {} : vars;

        if (gender != null) id += gender == Gender.FEMALE ? 'Female' : gender == Gender.MALE ? 'Male' : 'Other';
        if (pluralRuleSelector) {
            let pluralRule = pluralRuleSelector.format.select(pluralRuleSelector.valueOf());
            id += pluralRule.charAt(0).toUpperCase() + pluralRule.slice(1);
            vars.number = pluralRuleSelector.valueOf();
        }

        if (!this._currentLocale) {
            return id;
        }
        let r = this._getWithLocale(this._currentLocale, id.split('.'), vars);
        return r == null ? id : r;
    }

    _getWithLocale(locale, id, vars) {
        let message = this._resolveId(this._assets.get(locale), id);
        if (message != null) return this._applyMessage(message, vars);

        let fallbacks = this._fallbacks.get(locale);
        if (fallbacks != null) {
            // could use map/filter here, but it is faster using for/return
            for (let fl of fallbacks) {
                let r = this._getWithLocale(fl, id, vars);
                if (r != null) return r;
            }
        }
        return null;
    }

    _applyMessage(message, vars) {
        return message.replace(/\$(\$|[A-Za-z0-9_-]+)/g, (_, s) =>
            s == '$' ? '$' : (vars[s] || 'undefined'));
    }

    _resolveId(root, id) {
        let r = root;
        for (let frag of id) {
            if (r === undefined || r === null || r.constructor != Object) {
                return null;
            }
            r = r[frag];
        }
        return typeof r == 'string' ? r : null;
    }

    reflectOptions() {
        let supportsLocales = this._localeDirName.values();
        let fallbacks = {};
        for (let [from, to] of this._fallbacks) {
            fallbacks[from.toString()] = to.slice(0);
        }
        return {
            defaultLocale: this._defaultLocale,
            supportsLocales,
            fallbacks,
            assets: {
                src: this._assetSrc,
                files: this._assetFiles.slice(0),
                cleanUnusedAssets: this._cleanUnusedAssets,
                loadAssetsVia: this._loadAssetsVia,
            },
        };
    }

    clone() {
        let r = new MsgLocalization(this.reflectOptions());
        r._assets = this._assets;
        r._currentLocale = this._currentLocale;
        return r;
    }
}

export class PluralRuleSelector {
    constructor(format, value) {
        this.format = format;
        this._value = value;
    }

    valueOf() {
        return this._value;
    }
}

export class LocaleEvent {
    constructor(type) {
        this._type = type;
    }

    get type() {
        return this._type;
    }
}

export class Gender {
    constructor(str) {
        this._str = '';
        if (!Gender._constructable) {
            throw new Error('Illegal constructor for Gender.');
        }
        this._str = str;
    }

    toString() {
        return this._str;
    }
}

Gender._constructable = true;

Gender.FEMALE = new Gender('female');
Gender.MALE = new Gender('male');
Gender.OTHER = new Gender('other');

Gender._constructable = false;