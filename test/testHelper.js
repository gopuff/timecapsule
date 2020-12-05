/**
 * Important helpers for testing.
 *
 * @fileoverview
 */

const chai = require('chai')
const sinon = require('sinon')
const sinonTest = require('sinon-test')

const assert = chai.assert

// For stubbing and spying
const sinonTestWrapper = sinonTest(sinon)

class BaseTestHelper {
  constructor() {
    // Sinon related fields
    this._spy = undefined
    this._stub = undefined
    this._replace = undefined
    this._replaceGetter = undefined
    this._replaceSetter = undefined
    this._mock = undefined

    this._dateNowFunc = Date.now

    this.setup = this.setup.bind(this)
    this.tearDown = this.tearDown.bind(this)
    this.withStubs = this.withStubs.bind(this)

    this.patchNow = this.patchNow.bind(this)
    this.expectFail = this.expectFail.bind(this)
  }

  get assert() {
    return assert
  }

  /**
   * If the current test is being ran with #withStubs(),
   * this points to the sinon context's #spy() method.
   */
  get spy() {
    return this._spy
  }

  /**
   * If the current test is being ran with #withStubs(),
   * this points to the sinon context's #replaceGetter() method.
   *
   * You can use this to replace a getter on a `class` instance.
   */
  get replaceGetter() {
    return this._replaceGetter
  }

  /**
   * Tasks to be ran during #tearDown()
   */
  get tearDownTasks() {
    if (!this._tearDownTasks) {
      this._tearDownTasks = []
    }

    return this._tearDownTasks
  }

  /**
   * Run your test in a Sinon sandbox so you can use stubs and spys
   * without having to manually cleanup afterwards.
   * @param {Function} testCb The test function to be ran.
   */
  withStubs(testCb) {
    const self = this

    // The use of `function`, instead of arrow function, is intentional here.
    return sinonTestWrapper(function () {
      // For convenience,
      // add sinon context methods to the testHelper
      self._spy = this.spy
      self._stub = this.stub
      self._replace = this.replace
      self._replaceGetter = this.replaceGetter
      self._mock = this.mock

      this.clock.restore()
      return testCb.call(this)
    })
  }

  /**
   * Stub Date.now to always return the provided date value.
   * @param {Number|Date} date
   */
  patchNow(v) {
    const now = new Date(v).getTime()
    Date.now = () => now

    if (this._attachedResetDateAfterEach) {
      return
    }

    this._attachedResetDateAfterEach = true
    afterEach(this.resetDateNowFunc.bind(this))
  }

  /**
   * Undo the effects of `#patchNow()`
   */
  resetDateNowFunc() {
    Date.now = this._dateNowFunc
  }

  /**
   * A helper for testing an expected failure in an operation or entire test case.
   *
   * If the operation does not throw or there is no operation provided,
   * this helper will throw an error.
   *
   * @param {?Function} operation
   * @param {?Function<Error>} onFail This will always be called with whatever the operation throws.
   */
  expectFail(operation, onFail) {
    if (!operation && onFail) {
      throw new Error('Cannot provide onFail without an operation to run.')
    }

    try {
      if (operation) {
        operation()
      }

      throw new Error('This operation should have failed.')
    } catch (err) {
      if (!onFail) {
        throw err
      }

      onFail(err)
    }
  }

  /**
   * Call before each test run to setup any dependencies.
   */
  setup() {
    this.enqueueTearDownTask(() => this.clearStubs())
  }

  /**
   * Should be called after each test
   * to teardown any side effects that were introduced during the test run or its setup.
   */
  tearDown() {
    this.runTearDownTasks()
  }

  /**
   * Enqueue a task onto the tear down tasks
   * that will be ran in order during #tearDown()
   * @param {Function} task
   */
  enqueueTearDownTask(task) {
    this.tearDownTasks.push(task)
  }

  /**
   * Dequeue and run all tear down tasks
   */
  runTearDownTasks() {
    while (this.tearDownTasks.length) {
      this.tearDownTasks.shift()()
    }
  }

  /**
   * To avoid collision errors,
   * you may need to call this to clear,restore sinon stubs between tests
   * if 1) you are using sinon directly [instead of leveraging #withStubs()]
   *       in any repeating part of your test suite or
   * 2) you stubbed something via sinon directly and need to restore it at the end of your test suite.
   *
   * If you are using #withStubs() on the top level `describe` suite in your test file,
   * you should call this in its `#afterAll()` function to avoid collision errors.
   *
   * Otherwise, you don't need to call it if you're using #withStubs() on each `it` test
   * so long as you're not using sinon directly for stubs elsewhere in your test suite.
   */
  clearStubs() {
    sinon.restore()
  }

  static instance() {
    return new this(...arguments)
  }
}

module.exports = BaseTestHelper
