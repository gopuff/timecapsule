const chai = require('chai')
const sinon = require('sinon')

const helper = require('../testHelper').instance()
const assert = chai.assert

describe('testHelper', () => {
	const unit = helper

	describe('#expectFail()', () => {
		it('should succeed to call onFail with the error from the failing operation that throws.', () => {
			const now = Date.now()
			const expectedError = new Error(`The operation failed at ${now}`)

			const operationCb = sinon.stub().callsFake(() => {
				console.log('Running failing operation')
				throw expectedError
			})

			const onFailCb = sinon.stub().callsFake((err) => {
				assert.equal(err.message, `The operation failed at ${now}`)
			})

			unit.expectFail(operationCb, onFailCb)

			assert.isTrue(operationCb.calledOnce)
			assert.isTrue(onFailCb.calledOnce)
			assert.deepEqual(onFailCb.lastCall.args, [expectedError])
		})

		it('should ensure an error is thrown and onFail is invoked even when the operation does not throw an error', () => {
			const expectedErrorMessage = `This operation should have failed.`

			const operationCb = sinon.stub().callsFake(() => {
				console.log('Running a non-failing operation')
			})

			const onFailCb = sinon.stub().callsFake((err) => {
				assert.equal(err.message, expectedErrorMessage)
			})

			unit.expectFail(operationCb, onFailCb)

			assert.isTrue(operationCb.calledOnce)
			assert.isTrue(onFailCb.calledOnce)
			assert.equal(onFailCb.lastCall.args.length, 1)
			assert.equal(onFailCb.lastCall.args[0].message, expectedErrorMessage)
		})

		it('should throw an error when no operation is provided', () => {
			const expectedErrorMessage = `This operation should have failed.`

			try {
				console.log('Running non-failing operation')
				unit.expectFail()
			} catch (err) {
				assert.equal(err.message, expectedErrorMessage)
			}
		})

		it('should throw the caught error when onFail callback not provided.', () => {
			const now = Date.now()
			const expectedError = new Error(`The operation failed at ${now}`)

			const operationCb = sinon.stub().callsFake(() => {
				console.log('Running non-failing operation')
				throw expectedError
			})

			let caughtError = undefined
			try {
				unit.expectFail(operationCb)
			} catch (err) {
				caughtError = err
			}

			assert.isTrue(operationCb.calledOnce)
			assert.equal(caughtError.message, expectedError.message)
		})

		it('should throw an error when onFail is provided without an operation to run.', () => {
			const onFailCb = sinon.stub()

			let caughtError = undefined
			try {
				unit.expectFail(undefined, onFailCb)
			} catch (err) {
				caughtError = err
			}

			assert.isFalse(onFailCb.called)
			assert.equal(caughtError.message, 'Cannot provide onFail without an operation to run.')
		})
	})
})
