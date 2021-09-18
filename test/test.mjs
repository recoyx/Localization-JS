import { MsgLocalization, Gender, PluralRuleSelector, parseLocale } from '../src/MsgLocalization.js';

const localization = new MsgLocalization({
    supportsLocales: ['en-US'],
    defaultLocale: 'en-US',
    assets: {
        src: 'test/res/lang',
        files: ['common'],
        cleanUnusedAssets: true,
        loadAssetsVia: 'fileSystem',
    },
});

(async () => {
    // Promise<boolean>
    await localization.load();

    const t = localization.t.bind(localization);
    console.log(t('common.messageId'));
    console.log(t('common.parameterized', { x: 'foo' }));
    console.log(t('common.contextual', Gender.FEMALE));
    console.log(t('common.qty', new PluralRuleSelector(new Intl.PluralRules(localization.currentLocaleSequenceStr), 10)));
})();