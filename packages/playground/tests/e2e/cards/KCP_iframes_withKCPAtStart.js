import { Selector, ClientFunction } from 'testcafe';

import { start } from '../commonUtils';

import { fillCardNumber, fillDateAndCVC, fillTaxNumber, fillPwd } from './kcpUtils';

import { KOREAN_TEST_CARD, NON_KOREAN_TEST_CARD, TEST_TAX_NUMBER_VALUE } from '../constants';

const passwordHolder = Selector('.card-field [data-cse="encryptedPassword"]');

const getCardIsValid = ClientFunction(() => {
    return window.card.isValid;
});

const getCardState = ClientFunction((what, prop) => {
    return window.card.state[what][prop];
});

fixture`Starting with KCP fields`.page`http://localhost:3020/cards/?testing=testcafe&isKCP=true&countryCode=KR`;

// Green 1
test(
    'Fill in card number that will hide KCP fields, ' +
        'then check password iframe is hidden, ' +
        'then complete the form & check component becomes valid',
    async t => {
        // Start, allow time for iframes to load
        await start(t, 2000, 0.85);

        // Fill card field with non-korean card
        await fillCardNumber(t, NON_KOREAN_TEST_CARD);

        // Does the password securedField get removed
        await t.expect(passwordHolder.exists).notOk();

        // Complete form
        await fillDateAndCVC(t);

        // Expect card to now be valid
        await t.expect(getCardIsValid()).eql(true);
    }
);

// Green 2
test(
    'Fill in all KCP details, ' +
        'then check card state for taxNumber & password entries, ' +
        'then replace card number with non-korean card and check taxNumber and password state are cleared',
    async t => {
        // Start, allow time for iframes to load
        await start(t, 2000, 0.85);

        // Complete form with korean card number
        await fillCardNumber(t, KOREAN_TEST_CARD);
        await fillDateAndCVC(t);
        await fillTaxNumber(t);
        await fillPwd(t);

        // Expect card to now be valid
        await t.expect(getCardIsValid()).eql(true);

        // Expect card state to have tax and pwd elements
        await t.expect(getCardState('data', 'taxNumber')).eql(TEST_TAX_NUMBER_VALUE);
        await t.expect(getCardState('data', 'encryptedPassword')).contains('adyenjs_0_1_'); // check for blob

        await t.expect(getCardState('valid', 'taxNumber')).eql(true);
        await t.expect(getCardState('valid', 'encryptedPassword')).eql(true);

        // Replace number
        await fillCardNumber(t, NON_KOREAN_TEST_CARD, true);

        // (Does the password securedField get removed)
        await t.expect(passwordHolder.exists).notOk();

        // Expect card state's tax and pwd elements to have been cleared/reset
        await t.expect(getCardState('data', 'taxNumber')).eql(undefined);
        await t.expect(getCardState('data', 'encryptedPassword')).eql(undefined);

        await t.expect(getCardState('valid', 'taxNumber')).eql(false);
        await t.expect(getCardState('valid', 'encryptedPassword')).eql(false);

        // Expect card to still be valid
        await t.expect(getCardIsValid()).eql(true);
    }
);

// Green 3
test(
    'Fill in card number that will hide KCP fields, ' +
        'then complete form and expect component to be valid & to be able to pay,' +
        'then replace card number with korean card and expect component to be valid & to be able to pay',
    async t => {
        await start(t, 2000, 0.85);

        // handler for alert that's triggered on successful payment
        await t.setNativeDialogHandler(() => true);

        // Complete form with korean card number
        await fillCardNumber(t, NON_KOREAN_TEST_CARD);
        await fillDateAndCVC(t);

        // Expect card to now be valid
        await t.expect(getCardIsValid()).eql(true);

        // click pay
        await t
            //            .click('.card-field .adyen-checkout__button--pay') // Can't do this in testing scenario - for some reason it triggers a redirect to a hpp/collectKcpAuthentication page
            // no errors
            .expect(Selector('.adyen-checkout__field--error').exists)
            .notOk();

        // Replace number with non-korean card
        await fillCardNumber(t, KOREAN_TEST_CARD, true);

        // Complete form
        await fillTaxNumber(t);
        await fillPwd(t);

        // Expect card to now be valid
        await t.expect(getCardIsValid()).eql(true);

        // click pay
        await t
            .click('.card-field .adyen-checkout__button--pay')
            // no errors
            .expect(Selector('.adyen-checkout__field--error').exists)
            .notOk()
            .wait(1000);
    }
);
