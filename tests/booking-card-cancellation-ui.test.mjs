import { test, expect } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { parseCardRequest, requireCardOwner, cardAttemptView, readCardAttemptResult } from '../supabase/functions/_shared/booking-card-response.ts';
import { cardPaymentPresentation, dueAtPickup, cardCancellationError } from '../utils/bookingCardPayment.ts';
const user=randomUUID(), drop=randomUUID(), booking=randomUUID(), attempt=randomUUID();
const end='2030-01-01T10:00:00.000Z';
const a={ id:attempt,user_id:user,drop_id:drop,booking_id:booking,drop_end:end,state:'booked',
  authorized_cents:8000,final_cents:null,frozen_at:null,release_reason:null,intent_id:'pi_PRIVATE',last_error:'private',product_id:randomUUID() };
const active={status:'active',end_time:end};
const before=new Date(end).getTime()-1;
const card={payment_method:'card',payment_status:'authorized',final_price:80};
const state=()=>cardAttemptView(a,active,before);

test('only one unambiguous owned target and bounded status batches are accepted',()=>{
  expect(parseCardRequest({action:'cancel',booking_id:booking}).booking_id).toBe(booking);
  expect(parseCardRequest({action:'status',attempt_id:attempt}).attempt_id).toBe(attempt);
  expect(parseCardRequest({action:'statuses',booking_ids:[booking]}).action).toBe('statuses');
  for(const body of [
    {action:'cancel'}, {action:'cancel',booking_id:booking,attempt_id:attempt},
    {action:'cancel',booking_id:'not-a-uuid'}, {action:'cancel',attempt_id:1},
    {action:'statuses',booking_ids:[]}, {action:'statuses',booking_ids:Array(51).fill(booking)},
    {action:'statuses',booking_ids:['bad']}, {action:'statuses',booking_ids:[booking],booking_id:booking},
    {action:'refund',booking_id:booking}, {action:'start',attempt_id:attempt,product_id:randomUUID(),drop_id:drop,variant_id:'bad'},
  ]) expect(()=>parseCardRequest(body)).toThrow('REQUEST_INVALID');
});
test('composite RPC results accept exactly one object or one row, never an ambiguous result',()=>{
  expect(readCardAttemptResult(a)).toEqual(a);expect(readCardAttemptResult([a])).toEqual(a);
  for(const value of [null,[],[a,a],{},'bad',{id:'invalid'}])expect(()=>readCardAttemptResult(value)).toThrow('CARD_DATABASE_RETRY_REQUIRED');
});
test('foreign ownership is not exposed even for a correctly formatted known ID',()=>{
  expect(()=>requireCardOwner(a,randomUUID())).toThrow('ATTEMPT_NOT_FOUND');
  expect(()=>requireCardOwner(a,user)).not.toThrow();
});
test('sanitized owned status never exposes Stripe IDs, secrets, SQL codes or customer identities',()=>{
  const view=state();
  for(const key of ['intent_id','client_secret','last_error','user_id','drop_id','product_id'])expect(key in view).toBe(false);
  expect(view.can_cancel).toBe(true);expect(view.paid).toBe(false);
});
test('cancellation hint closes exactly at deadline or when drop status/end changes',()=>{
  expect(cardAttemptView(a,active,new Date(end).getTime()).can_cancel).toBe(false);
  expect(cardAttemptView(a,{...active,status:'completed'},before).can_cancel).toBe(false);
  expect(cardAttemptView(a,{...active,end_time:'2030-01-02T10:00:00.000Z'},before).can_cancel).toBe(false);
  expect(cardAttemptView(a,null,before).can_cancel).toBe(false);
  for(const phase of ['capture_pending','captured','released','release_pending','review'])
    expect(cardAttemptView({...a,state:phase},active,before).can_cancel).toBe(false);
});
test('pending release is not labelled paid, released or refunded',()=>{
  const pending=cardAttemptView({...a,state:'release_pending',release_reason:'CUSTOMER_CANCELLED'},active,before);
  const message=cardPaymentPresentation(card,pending);
  expect(pending.paid).toBe(false);expect(pending.customer_cancelled).toBe(true);
  expect(message.title).toBe('Rilascio in corso');expect(message.detail).toContain('Non devi ripetere');
});
test('verified release, captured payment, free settlement and real refund remain different',()=>{
  const released=cardAttemptView({...a,state:'released',release_reason:'CUSTOMER_CANCELLED'},active,before);
  expect(cardPaymentPresentation({...card,payment_status:'failed'},released).title).toBe('Sblocco confermato');
  expect(cardPaymentPresentation(card,state()).title).toContain('non addebitato');
  expect(cardPaymentPresentation({...card,payment_status:'captured'}).title).toBe('Già pagato con carta');
  const free=cardAttemptView({...a,state:'released',final_cents:0,frozen_at:end},active,before);
  expect(free.paid).toBe(true);expect(cardPaymentPresentation(card,free).title).toBe('Già pagato con carta');
  expect(cardPaymentPresentation({...card,payment_status:'refunded'}).title).toBe('Rimborsato sulla carta');
});
test('review and capture pending never present a fresh cash demand',()=>{
  for(const phase of ['review','capture_pending']){
    const message=cardPaymentPresentation(card,{...state(),state:phase});
    expect(message.tone).toBe('warning');expect(message.detail).toMatch(/Non pagare|Non effettuare/);
  }
});
test('mixed pickup total excludes every card hold/capture and includes COD only',()=>{
  for(const status of ['authorized','captured','failed','refunded']) expect(dueAtPickup({...card,payment_status:status})).toBe(0);
  expect([card,{payment_method:'cod',payment_status:'pending',final_price:19.5}].reduce((s,p)=>s+dueAtPickup(p),0)).toBe(19.5);
  expect(dueAtPickup({final_price:12})).toBe(12);expect(dueAtPickup({final_price:'12.50'})).toBe(12.5);
  expect(dueAtPickup({final_price:'invalid'})).toBe(0);
});
test('bounded error messages explain expired/capture states without claiming success',()=>{
  expect(cardCancellationError('CANCELLATION_DEADLINE_PASSED')).toContain('Non è più possibile');
  expect(cardCancellationError('SETTLEMENT_ALREADY_STARTED')).toContain('L’incasso è già iniziato');
  expect(cardCancellationError('UNEXPECTED_RAW_SERVER_ERROR')).toContain('potrebbe essere già stata ricevuta');
});
